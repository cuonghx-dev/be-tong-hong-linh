import type {
  PurchaseReportFilter,
  SupplierPayableDetailGroupDto,
  SupplierPayableSource,
} from '@app/shared'
import { useSearchParams } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Label } from '@/shared/ui/label'
import { useSuppliers } from '../../api/useSuppliers'
import { useSupplierPayableDetail } from '../../api/usePurchaseReports'
import { formatDate, money, periodLabel } from '@/shared/lib/report-format'
import { StatusRow, tdClass, tdMoney, thClass } from '@/shared/ui/report-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 7

// Nhãn loại chứng từ theo nguồn phát sinh công nợ.
const SOURCE_LABEL: Record<SupplierPayableSource, string> = {
  PURCHASE: 'Mua hàng',
  CASH: 'Phiếu chi',
  BANK: 'Ủy nhiệm chi',
}

// Chi tiết công nợ phải trả NCC (TK 331) — nhóm theo NCC: dòng dư đầu kỳ,
// các chứng từ phát sinh (kèm dư lũy kế), dòng cộng nhóm. Lọc được 1 NCC.
export function SupplierPayableDetailReport({ filter }: { filter: PurchaseReportFilter }) {
  const { data, isLoading, isError } = useSupplierPayableDetail(filter)
  const [params, setParams] = useSearchParams()
  // Danh sách NCC cho dropdown lọc (trang đầu đủ dùng cho SME).
  const { data: suppliers } = useSuppliers({ page: 1, pageSize: 200 })

  const setSupplier = (id: string) => {
    const next = new URLSearchParams(params)
    if (id) next.set('supplierId', id)
    else next.delete('supplierId')
    next.delete('page')
    setParams(next, { replace: true })
  }

  const groups = data?.groups ?? []

  return (
    <div className="overflow-auto">
      <div className="flex items-center gap-2 px-1 pt-3">
        <Label className="font-normal flex items-center gap-1.5 text-sm text-slate-600">
          Nhà cung cấp
          <Select
            value={filter.supplierId || 'all'}
            onValueChange={(v) => setSupplier(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-auto max-w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {(suppliers?.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
      </div>

      <div className="py-4 text-center">
        <div className="text-lg font-bold uppercase text-slate-800">
          Chi tiết công nợ phải trả nhà cung cấp
        </div>
        <div className="text-sm italic text-slate-500">
          Tài khoản 331 — {periodLabel(filter)}
        </div>
      </div>

      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>Ngày hạch&nbsp;toán</TableHead>
            <TableHead className={thClass}>Số chứng&nbsp;từ</TableHead>
            <TableHead className={thClass}>Loại chứng&nbsp;từ</TableHead>
            <TableHead className={thClass}>Diễn&nbsp;giải</TableHead>
            <TableHead className={`${thClass} text-right`}>Phát&nbsp;sinh Nợ</TableHead>
            <TableHead className={`${thClass} text-right`}>Phát&nbsp;sinh Có</TableHead>
            <TableHead className={`${thClass} text-right`}>Số&nbsp;dư</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && groups.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
          )}
          {groups.map((g) => (
            <GroupRows key={g.supplierId ?? g.supplierName} group={g} />
          ))}
          {groups.length > 0 && (
            <TableRow className="bg-slate-100 font-semibold">
              <TableCell colSpan={4} className={tdClass}>Tổng cộng</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalDebit ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalCredit ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalClosing ?? '0', true)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// Section 1 NCC: tên NCC, dư đầu, chứng từ phát sinh, cộng nhóm + dư cuối.
function GroupRows({ group: g }: { group: SupplierPayableDetailGroupDto }) {
  return (
    <>
      <TableRow className="bg-slate-50">
        <TableCell colSpan={COL_SPAN} className={`${tdClass} font-semibold`}>
          {g.supplierCode ? `${g.supplierCode} — ` : ''}
          {g.supplierName}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} className={`${tdClass} italic text-slate-500`}>Số dư đầu kỳ</TableCell>
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney} />
        <TableCell className={tdMoney}>{money(g.openingBalance, true)}</TableCell>
      </TableRow>
      {g.rows.map((r) => (
        <TableRow key={`${r.voucherId}-${r.debitAmount}-${r.creditAmount}`}>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</TableCell>
          <TableCell className={`${tdClass} whitespace-nowrap`}>{SOURCE_LABEL[r.source]}</TableCell>
          <TableCell className={`${tdClass} max-w-[360px] truncate`} title={r.description ?? ''}>
            {r.description}
          </TableCell>
          <TableCell className={tdMoney}>{money(r.debitAmount)}</TableCell>
          <TableCell className={tdMoney}>{money(r.creditAmount)}</TableCell>
          <TableCell className={tdMoney}>{money(r.balance, true)}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-semibold">
        <TableCell colSpan={4} className={tdClass}>Cộng nhóm — dư cuối kỳ</TableCell>
        <TableCell className={tdMoney}>{money(g.debitAmount, true)}</TableCell>
        <TableCell className={tdMoney}>{money(g.creditAmount, true)}</TableCell>
        <TableCell className={tdMoney}>{money(g.closingBalance, true)}</TableCell>
      </TableRow>
    </>
  )
}
