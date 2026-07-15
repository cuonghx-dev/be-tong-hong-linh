import type { CashReportFilter } from '@app/shared'
import { useDailyBalance } from '../../api/useCashReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 5

// Bảng kê số dư tiền theo ngày — chỉ liệt kê ngày có phát sinh thu/chi.
export function DailyBalanceReport({ filter }: { filter: CashReportFilter }) {
  const { data, isLoading, isError } = useDailyBalance(filter)
  const rows = data?.rows ?? []

  return (
    <table className="w-full min-w-[720px] border-collapse text-sm">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className={thClass}>Ngày</th>
          <th className={thClass}>Tồn đầu&nbsp;ngày</th>
          <th className={thClass}>Thu</th>
          <th className={thClass}>Chi</th>
          <th className={thClass}>Tồn cuối&nbsp;ngày</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && (
          <tr className="bg-slate-50/60 font-medium">
            <td colSpan={4} className={tdClass}>Số dư đầu kỳ</td>
            <td className={tdMoney}>{money(data.openingBalance, true)}</td>
          </tr>
        )}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r) => (
          <tr key={r.date} className="hover:bg-slate-50">
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.date)}</td>
            <td className={tdMoney}>{money(r.openingBalance, true)}</td>
            <td className={tdMoney}>{money(r.receiptAmount)}</td>
            <td className={tdMoney}>{money(r.paymentAmount)}</td>
            <td className={tdMoney}>{money(r.closingBalance, true)}</td>
          </tr>
        ))}
        {data && rows.length > 0 && (
          <tr className="bg-slate-50 font-semibold">
            <td className={tdClass}>Tổng cộng</td>
            <td className={tdClass} />
            <td className={tdMoney}>{money(data.totalReceipt, true)}</td>
            <td className={tdMoney}>{money(data.totalPayment, true)}</td>
            <td className={tdMoney}>{money(data.closingBalance, true)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
