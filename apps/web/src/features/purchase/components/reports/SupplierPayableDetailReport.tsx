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
import { useSuppliers } from '../../api/useSuppliers'
import { useSupplierPayableDetail } from '../../api/usePurchaseReports'
import { formatDate, money, periodLabel, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

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
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
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
        </label>
      </div>

      <div className="py-4 text-center">
        <div className="text-lg font-bold uppercase text-slate-800">
          Chi tiết công nợ phải trả nhà cung cấp
        </div>
        <div className="text-sm italic text-slate-500">
          Tài khoản 331 — {periodLabel(filter)}
        </div>
      </div>

      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={thClass}>Ngày hạch toán</th>
            <th className={thClass}>Số chứng từ</th>
            <th className={thClass}>Loại chứng từ</th>
            <th className={thClass}>Diễn giải</th>
            <th className={`${thClass} text-right`}>Phát sinh Nợ</th>
            <th className={`${thClass} text-right`}>Phát sinh Có</th>
            <th className={`${thClass} text-right`}>Số dư</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && groups.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
          )}
          {groups.map((g) => (
            <GroupRows key={g.supplierId ?? g.supplierName} group={g} />
          ))}
          {groups.length > 0 && (
            <tr className="bg-slate-100 font-semibold">
              <td colSpan={4} className={tdClass}>Tổng cộng</td>
              <td className={tdMoney}>{money(data?.totalDebit ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalCredit ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalClosing ?? '0', true)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Section 1 NCC: tên NCC, dư đầu, chứng từ phát sinh, cộng nhóm + dư cuối.
function GroupRows({ group: g }: { group: SupplierPayableDetailGroupDto }) {
  return (
    <>
      <tr className="bg-slate-50">
        <td colSpan={COL_SPAN} className={`${tdClass} font-semibold`}>
          {g.supplierCode ? `${g.supplierCode} — ` : ''}
          {g.supplierName}
        </td>
      </tr>
      <tr>
        <td colSpan={4} className={`${tdClass} italic text-slate-500`}>Số dư đầu kỳ</td>
        <td className={tdMoney} />
        <td className={tdMoney} />
        <td className={tdMoney}>{money(g.openingBalance, true)}</td>
      </tr>
      {g.rows.map((r) => (
        <tr key={`${r.voucherId}-${r.debitAmount}-${r.creditAmount}`} className="hover:bg-slate-50">
          <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
          <td className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</td>
          <td className={`${tdClass} whitespace-nowrap`}>{SOURCE_LABEL[r.source]}</td>
          <td className={`${tdClass} max-w-[360px] truncate`} title={r.description ?? ''}>
            {r.description}
          </td>
          <td className={tdMoney}>{money(r.debitAmount)}</td>
          <td className={tdMoney}>{money(r.creditAmount)}</td>
          <td className={tdMoney}>{money(r.balance, true)}</td>
        </tr>
      ))}
      <tr className="font-semibold">
        <td colSpan={4} className={tdClass}>Cộng nhóm — dư cuối kỳ</td>
        <td className={tdMoney}>{money(g.debitAmount, true)}</td>
        <td className={tdMoney}>{money(g.creditAmount, true)}</td>
        <td className={tdMoney}>{money(g.closingBalance, true)}</td>
      </tr>
    </>
  )
}
