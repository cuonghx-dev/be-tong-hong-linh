import type { SalesReportFilter } from '@app/shared'
import { useCustomerReceivableSummary } from '../../api/useSalesReports'
import { money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 6

// Tổng hợp công nợ phải thu KH (TK 131): mỗi KH 1 dòng
// dư Nợ đầu kỳ / phát sinh Nợ / phát sinh Có / dư Nợ cuối kỳ.
export function ReceivableSummaryReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useCustomerReceivableSummary(filter)
  const rows = data?.rows ?? []

  return (
    <table className="w-full min-w-[900px] border-collapse text-sm">
      <thead className="sticky top-0 z-10">
        <tr>
          <th className={thClass}>Mã khách hàng</th>
          <th className={thClass}>Tên khách hàng</th>
          <th className={thClass}>Dư Nợ đầu kỳ</th>
          <th className={thClass}>Phát sinh Nợ</th>
          <th className={thClass}>Phát sinh Có</th>
          <th className={thClass}>Dư Nợ cuối kỳ</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có công nợ trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.customerId ?? r.customerName}-${i}`} className="hover:bg-slate-50">
            <td className={`${tdClass} whitespace-nowrap`}>{r.customerCode}</td>
            <td className={`${tdClass} max-w-[320px] truncate`} title={r.customerName}>
              {r.customerName}
            </td>
            <td className={tdMoney}>{money(r.openingBalance)}</td>
            <td className={tdMoney}>{money(r.debitAmount)}</td>
            <td className={tdMoney}>{money(r.creditAmount)}</td>
            <td className={tdMoney}>{money(r.closingBalance)}</td>
          </tr>
        ))}
        {data && rows.length > 0 && (
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={2} className={tdClass}>Tổng cộng</td>
            <td className={tdMoney}>{money(data.totalOpening, true)}</td>
            <td className={tdMoney}>{money(data.totalDebit, true)}</td>
            <td className={tdMoney}>{money(data.totalCredit, true)}</td>
            <td className={tdMoney}>{money(data.totalClosing, true)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
