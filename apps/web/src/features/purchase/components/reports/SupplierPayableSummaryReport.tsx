import type { PurchaseReportFilter } from '@app/shared'
import { useSupplierPayableSummary } from '../../api/usePurchaseReports'
import { money, periodLabel, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

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

      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className={thClass}>STT</th>
            <th className={thClass}>Mã NCC</th>
            <th className={thClass}>Tên nhà cung&nbsp;cấp</th>
            <th className={`${thClass} text-right`}>Số&nbsp;dư đầu&nbsp;kỳ</th>
            <th className={`${thClass} text-right`}>Phát&nbsp;sinh Có</th>
            <th className={`${thClass} text-right`}>Phát&nbsp;sinh Nợ</th>
            <th className={`${thClass} text-right`}>Số&nbsp;dư cuối&nbsp;kỳ</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
          )}
          {rows.map((r, i) => (
            <tr key={r.supplierId ?? r.supplierName} className="hover:bg-slate-50">
              <td className={`${tdClass} w-12 text-center`}>{i + 1}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{r.supplierCode}</td>
              <td className={tdClass}>{r.supplierName}</td>
              <td className={tdMoney}>{money(r.openingBalance)}</td>
              <td className={tdMoney}>{money(r.creditAmount)}</td>
              <td className={tdMoney}>{money(r.debitAmount)}</td>
              <td className={tdMoney}>{money(r.closingBalance, true)}</td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={3} className={tdClass}>Tổng cộng</td>
              <td className={tdMoney}>{money(data?.totalOpening ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalCredit ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalDebit ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalClosing ?? '0', true)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
