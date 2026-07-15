import type { SalesReportFilter } from '@app/shared'
import { useSalesDetailReport } from '../../api/useSalesReports'
import { formatDate, money, quantity, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 12

// Sổ chi tiết bán hàng: từng dòng hàng của chứng từ bán trong kỳ + dòng tổng cộng.
export function SalesDetailReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useSalesDetailReport(filter)
  const rows = data?.rows ?? []

  return (
    <table className="w-full min-w-[1200px] border-collapse text-sm">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className={thClass}>Ngày hạch&nbsp;toán</th>
          <th className={thClass}>Ngày chứng&nbsp;từ</th>
          <th className={thClass}>Số chứng&nbsp;từ</th>
          <th className={thClass}>Khách&nbsp;hàng</th>
          <th className={thClass}>Mặt&nbsp;hàng</th>
          <th className={thClass}>ĐVT</th>
          <th className={thClass}>Số&nbsp;lượng</th>
          <th className={thClass}>Đơn&nbsp;giá</th>
          <th className={thClass}>Chiết&nbsp;khấu</th>
          <th className={thClass}>Doanh&nbsp;thu</th>
          <th className={thClass}>Thuế&nbsp;GTGT</th>
          <th className={thClass}>Tổng thanh&nbsp;toán</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
            <td className={`${tdClass} whitespace-nowrap`}>{r.voucherNo}</td>
            <td className={`${tdClass} max-w-[220px] truncate`} title={r.customerName ?? ''}>
              {r.customerName}
            </td>
            <td className={`${tdClass} max-w-[220px] truncate`} title={r.itemName ?? ''}>
              {r.itemName}
            </td>
            <td className={tdClass}>{r.unit}</td>
            <td className={tdMoney}>{quantity(r.quantity)}</td>
            <td className={tdMoney}>{money(r.unitPrice)}</td>
            <td className={tdMoney}>{money(r.discount)}</td>
            <td className={tdMoney}>{money(r.amount)}</td>
            <td className={tdMoney}>{money(r.vatAmount)}</td>
            <td className={tdMoney}>{money(r.totalPayment)}</td>
          </tr>
        ))}
        {data && rows.length > 0 && (
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={8} className={tdClass}>Tổng cộng</td>
            <td className={tdMoney}>{money(data.totalDiscount, true)}</td>
            <td className={tdMoney}>{money(data.totalAmount, true)}</td>
            <td className={tdMoney}>{money(data.totalVat, true)}</td>
            <td className={tdMoney}>{money(data.totalPayment, true)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
