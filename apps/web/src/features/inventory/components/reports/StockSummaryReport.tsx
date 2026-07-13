import type { StockSummaryFilter } from '@app/shared'
import { useStockSummary } from '../../api/useInventoryReports'
import { money, periodLabel, quantity, StatusRow, tdClass, tdMoney, thClass } from './report-utils'

const COL_SPAN = 11

// Tổng hợp tồn kho: mỗi VTHH 1 dòng — tồn đầu kỳ / nhập / xuất / tồn cuối kỳ
// (SL + giá trị do BE tính bằng Decimal). Dòng tổng cộng chỉ cộng giá trị.
export function StockSummaryReport({ filter }: { filter: StockSummaryFilter }) {
  const { data, isLoading, isError } = useStockSummary(filter)
  const rows = data?.rows ?? []

  return (
    <div className="p-3">
      <div className="pb-2 text-sm text-slate-500">{periodLabel(filter)}</div>
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr>
            <th rowSpan={2} className={thClass}>Mã VTHH</th>
            <th rowSpan={2} className={thClass}>Tên VTHH</th>
            <th rowSpan={2} className={thClass}>ĐVT</th>
            <th colSpan={2} className={thClass}>Tồn đầu kỳ</th>
            <th colSpan={2} className={thClass}>Nhập trong kỳ</th>
            <th colSpan={2} className={thClass}>Xuất trong kỳ</th>
            <th colSpan={2} className={thClass}>Tồn cuối kỳ</th>
          </tr>
          <tr>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <StatusRow colSpan={COL_SPAN}>Đang tải…</StatusRow>}
          {isError && <StatusRow colSpan={COL_SPAN}>Lỗi tải dữ liệu.</StatusRow>}
          {!isLoading && !isError && rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có số dư/phát sinh tồn kho trong kỳ.</StatusRow>
          )}
          {rows.map((r) => (
            <tr key={r.itemCode} className="hover:bg-slate-50">
              <td className={`${tdClass} whitespace-nowrap`}>{r.itemCode}</td>
              <td className={`${tdClass} max-w-[280px] truncate`} title={r.itemName ?? ''}>
                {r.itemName}
              </td>
              <td className={tdClass}>{r.unit}</td>
              <td className={tdMoney}>{quantity(r.openingQty)}</td>
              <td className={tdMoney}>{money(r.openingAmount)}</td>
              <td className={tdMoney}>{quantity(r.inQty)}</td>
              <td className={tdMoney}>{money(r.inAmount)}</td>
              <td className={tdMoney}>{quantity(r.outQty)}</td>
              <td className={tdMoney}>{money(r.outAmount)}</td>
              <td className={tdMoney}>{quantity(r.closingQty)}</td>
              <td className={tdMoney}>{money(r.closingAmount)}</td>
            </tr>
          ))}
          {data && rows.length > 0 && (
            <tr className="bg-slate-50/60 font-semibold">
              <td colSpan={3} className={tdClass}>Tổng cộng</td>
              <td className={tdMoney} />
              <td className={tdMoney}>{money(data.totalOpeningAmount, true)}</td>
              <td className={tdMoney} />
              <td className={tdMoney}>{money(data.totalInAmount, true)}</td>
              <td className={tdMoney} />
              <td className={tdMoney}>{money(data.totalOutAmount, true)}</td>
              <td className={tdMoney} />
              <td className={tdMoney}>{money(data.totalClosingAmount, true)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
