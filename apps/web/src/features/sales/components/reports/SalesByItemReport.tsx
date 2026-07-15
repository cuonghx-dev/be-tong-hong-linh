import type { SalesReportFilter } from '@app/shared'
import { useSalesByItemReport } from '../../api/useSalesReports'
import { money, quantity, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 8

// Tổng hợp bán hàng theo mặt hàng: gộp số lượng/doanh thu theo từng mặt hàng trong kỳ.
export function SalesByItemReport({ filter }: { filter: SalesReportFilter }) {
  const { data, isLoading, isError } = useSalesByItemReport(filter)
  const rows = data?.rows ?? []

  return (
    <table className="w-full min-w-[900px] border-collapse text-sm">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className={thClass}>Mã hàng</th>
          <th className={thClass}>Tên hàng</th>
          <th className={thClass}>ĐVT</th>
          <th className={thClass}>Số&nbsp;lượng</th>
          <th className={thClass}>Chiết&nbsp;khấu</th>
          <th className={thClass}>Doanh&nbsp;thu</th>
          <th className={thClass}>Thuế&nbsp;GTGT</th>
          <th className={thClass}>Tổng&nbsp;cộng</th>
        </tr>
      </thead>
      <tbody>
        {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
        {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
        {data && rows.length === 0 && (
          <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.itemId ?? r.itemName ?? 'none'}-${i}`} className="hover:bg-slate-50">
            <td className={`${tdClass} whitespace-nowrap`}>{r.itemCode}</td>
            <td className={`${tdClass} max-w-[320px] truncate`} title={r.itemName ?? ''}>
              {r.itemName ?? '(Không chọn mặt hàng)'}
            </td>
            <td className={tdClass}>{r.unit}</td>
            <td className={tdMoney}>{quantity(r.quantity)}</td>
            <td className={tdMoney}>{money(r.discount)}</td>
            <td className={tdMoney}>{money(r.amount)}</td>
            <td className={tdMoney}>{money(r.vatAmount)}</td>
            <td className={tdMoney}>{money(r.total)}</td>
          </tr>
        ))}
        {data && rows.length > 0 && (
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={4} className={tdClass}>Tổng cộng</td>
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
