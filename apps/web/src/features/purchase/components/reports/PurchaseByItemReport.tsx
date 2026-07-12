import type { PurchaseReportFilter } from '@app/shared'
import { usePurchaseByItemReport } from '../../api/usePurchaseReports'
import { money, periodLabel, quantity, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 7

// Tổng hợp mua hàng theo mặt hàng — gộp mọi dòng hàng trong kỳ theo mặt hàng.
export function PurchaseByItemReport({ filter }: { filter: PurchaseReportFilter }) {
  const { data, isLoading, isError } = usePurchaseByItemReport(filter)
  const rows = data?.rows ?? []

  return (
    <div className="overflow-auto">
      <div className="py-4 text-center">
        <div className="text-lg font-bold uppercase text-slate-800">
          Tổng hợp mua hàng theo mặt hàng
        </div>
        <div className="text-sm italic text-slate-500">{periodLabel(filter)}</div>
      </div>

      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={thClass}>STT</th>
            <th className={thClass}>Mặt hàng</th>
            <th className={thClass}>ĐVT</th>
            <th className={`${thClass} text-right`}>Số lượng</th>
            <th className={`${thClass} text-right`}>Tiền hàng</th>
            <th className={`${thClass} text-right`}>Thuế GTGT</th>
            <th className={`${thClass} text-right`}>Tổng thanh toán</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
          )}
          {rows.map((r, i) => (
            <tr key={`${r.itemId ?? r.itemName ?? 'none'}-${i}`} className="hover:bg-slate-50">
              <td className={`${tdClass} w-12 text-center`}>{i + 1}</td>
              <td className={tdClass}>{r.itemName ?? '(Không chọn mặt hàng)'}</td>
              <td className={tdClass}>{r.unit}</td>
              <td className={tdMoney}>{quantity(r.quantity)}</td>
              <td className={tdMoney}>{money(r.amount, true)}</td>
              <td className={tdMoney}>{money(r.vatAmount)}</td>
              <td className={tdMoney}>{money(r.total, true)}</td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={4} className={tdClass}>Tổng cộng</td>
              <td className={tdMoney}>{money(data?.totalAmount ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalVat ?? '0', true)}</td>
              <td className={tdMoney}>{money(data?.totalPayment ?? '0', true)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
