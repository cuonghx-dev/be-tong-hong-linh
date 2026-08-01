import type { PurchaseReportFilter } from '@app/shared'
import { useSupplierPayableSummary } from '../../api/usePurchaseReports'
import { money, periodLabel, StatusRow, tdClass, tdMoney, thClass } from './report-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const COL_SPAN = 7

// Tổng hợp công nợ phải trả NCC (TK 331) — mỗi NCC 1 dòng:
// dư Có đầu kỳ / phát sinh Có (mua chưa trả) / phát sinh Nợ (đã trả) / dư Có cuối kỳ.
export function SupplierPayableSummaryReport({ filter }: { filter: PurchaseReportFilter }) {
  const { data, isLoading, isError } = useSupplierPayableSummary(filter)
  const rows = data?.rows ?? []

  return (
    <div className="overflow-auto">
      <div className="py-4 text-center">
        <div className="text-lg font-bold uppercase text-slate-800">
          Tổng hợp công nợ phải trả nhà cung cấp
        </div>
        <div className="text-sm italic text-slate-500">
          Tài khoản 331 — {periodLabel(filter)}
        </div>
      </div>

      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>STT</TableHead>
            <TableHead className={thClass}>Mã NCC</TableHead>
            <TableHead className={thClass}>Tên nhà cung&nbsp;cấp</TableHead>
            <TableHead className={`${thClass} text-right`}>Số&nbsp;dư đầu&nbsp;kỳ</TableHead>
            <TableHead className={`${thClass} text-right`}>Phát&nbsp;sinh Có</TableHead>
            <TableHead className={`${thClass} text-right`}>Phát&nbsp;sinh Nợ</TableHead>
            <TableHead className={`${thClass} text-right`}>Số&nbsp;dư cuối&nbsp;kỳ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
          )}
          {rows.map((r, i) => (
            <TableRow key={r.supplierId ?? r.supplierName}>
              <TableCell className={`${tdClass} w-12 text-center`}>{i + 1}</TableCell>
              <TableCell className={`${tdClass} whitespace-nowrap`}>{r.supplierCode}</TableCell>
              <TableCell className={tdClass}>{r.supplierName}</TableCell>
              <TableCell className={tdMoney}>{money(r.openingBalance)}</TableCell>
              <TableCell className={tdMoney}>{money(r.creditAmount)}</TableCell>
              <TableCell className={tdMoney}>{money(r.debitAmount)}</TableCell>
              <TableCell className={tdMoney}>{money(r.closingBalance, true)}</TableCell>
            </TableRow>
          ))}
          {rows.length > 0 && (
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell colSpan={3} className={tdClass}>Tổng cộng</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalOpening ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalCredit ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalDebit ?? '0', true)}</TableCell>
              <TableCell className={tdMoney}>{money(data?.totalClosing ?? '0', true)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
