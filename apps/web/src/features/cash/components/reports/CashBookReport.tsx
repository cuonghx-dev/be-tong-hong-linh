import type { CashReportFilter } from '@app/shared'
import { useCashBook } from '../../api/useCashReports'
import { formatDate, money, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 9

// Sổ kế toán chi tiết quỹ tiền mặt: dòng số dư đầu kỳ + từng dòng hạch toán
// (thu/chi + tồn lũy kế do BE tính) + cộng phát sinh + số dư cuối kỳ.
export function CashBookReport({ filter }: { filter: CashReportFilter }) {
  const { data, isLoading, isError } = useCashBook(filter)
  const rows = data?.rows ?? []

  return (
    <table className="w-full min-w-[1000px] border-collapse text-sm">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className={thClass}>Ngày hạch toán</th>
          <th className={thClass}>Ngày chứng từ</th>
          <th className={thClass}>Số phiếu thu</th>
          <th className={thClass}>Số phiếu chi</th>
          <th className={thClass}>Diễn giải</th>
          <th className={thClass}>TK đối ứng</th>
          <th className={thClass}>Thu</th>
          <th className={thClass}>Chi</th>
          <th className={thClass}>Tồn</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && (
          <tr className="bg-slate-50/60 font-medium">
            <td colSpan={8} className={tdClass}>Số dư đầu kỳ</td>
            <td className={tdMoney}>{money(data.openingBalance, true)}</td>
          </tr>
        )}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{r.receiptNo}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{r.paymentNo}</td>
            <td className={`${tdClass} max-w-[300px] truncate`} title={r.description ?? ''}>
              {r.description}
            </td>
            <td className={tdClass}>{r.counterAccount}</td>
            <td className={tdMoney}>{money(r.receiptAmount)}</td>
            <td className={tdMoney}>{money(r.paymentAmount)}</td>
            <td className={tdMoney}>{money(r.balance, true)}</td>
          </tr>
        ))}
        {data && (
          <>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={6} className={tdClass}>Cộng phát sinh trong kỳ</td>
              <td className={tdMoney}>{money(data.totalReceipt, true)}</td>
              <td className={tdMoney}>{money(data.totalPayment, true)}</td>
              <td className={tdClass} />
            </tr>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={8} className={tdClass}>Số dư cuối kỳ</td>
              <td className={tdMoney}>{money(data.closingBalance, true)}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  )
}
