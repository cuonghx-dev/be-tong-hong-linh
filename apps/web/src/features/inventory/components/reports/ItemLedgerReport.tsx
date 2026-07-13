import type { ItemLedgerFilter, ItemLedgerRowDto } from '@app/shared'
import { useNavigate } from 'react-router-dom'
import { useItemLedger } from '../../api/useInventoryReports'
import {
  formatDate,
  money,
  periodLabel,
  quantity,
  StatusRow,
  tdClass,
  tdMoney,
  thClass,
} from './report-utils'

const COL_SPAN = 12

// Sổ chi tiết vật tư hàng hóa: dòng dư đầu + từng dòng nhập/xuất trong kỳ với
// tồn lũy kế (SL + giá trị do BE tính bằng Decimal) + cộng phát sinh + dư cuối.
export function ItemLedgerReport({ filter }: { filter: ItemLedgerFilter }) {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useItemLedger(filter)

  if (!filter.itemCode) {
    return <Status>Chọn vật tư hàng hóa để xem sổ chi tiết.</Status>
  }
  if (isLoading) return <Status>Đang tải…</Status>
  if (isError || !data) return <Status>Lỗi tải dữ liệu.</Status>

  // Drill-down: mở trang xem chứng từ gốc (phiếu nhập kho hoặc phiếu xuất kho).
  const openVoucher = (row: ItemLedgerRowDto) => {
    const base = row.voucherKind === 'RECEIPT' ? '/inventory/receipts' : '/inventory/issues'
    navigate(`${base}/${row.voucherId}`)
  }

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-baseline gap-2 pb-2">
        <span className="text-sm font-bold text-slate-700">{data.itemCode}</span>
        {data.itemName && <span className="text-sm text-slate-500">{data.itemName}</span>}
        {data.unit && <span className="text-sm text-slate-500">— ĐVT: {data.unit}</span>}
        <span className="ml-auto text-sm text-slate-500">{periodLabel(filter)}</span>
      </div>
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr>
            <th rowSpan={2} className={thClass}>Ngày hạch toán</th>
            <th rowSpan={2} className={thClass}>Ngày chứng từ</th>
            <th rowSpan={2} className={thClass}>Số chứng từ</th>
            <th rowSpan={2} className={thClass}>Diễn giải</th>
            <th rowSpan={2} className={thClass}>TK đối ứng</th>
            <th rowSpan={2} className={thClass}>Đơn giá</th>
            <th colSpan={2} className={thClass}>Nhập</th>
            <th colSpan={2} className={thClass}>Xuất</th>
            <th colSpan={2} className={thClass}>Tồn</th>
          </tr>
          <tr>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
            <th className={thClass}>SL</th>
            <th className={thClass}>Giá trị</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-50/60 font-medium">
            <td colSpan={10} className={tdClass}>Số dư đầu kỳ</td>
            <td className={tdMoney}>{quantity(data.openingQty, true)}</td>
            <td className={tdMoney}>{money(data.openingAmount, true)}</td>
          </tr>
          {data.rows.length === 0 && (
            <StatusRow colSpan={COL_SPAN}>Không có phát sinh trong kỳ.</StatusRow>
          )}
          {data.rows.map((r, i) => (
            <tr key={`${r.voucherId}-${i}`} className="hover:bg-slate-50">
              <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.postingDate)}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.voucherDate)}</td>
              <td className={`${tdClass} whitespace-nowrap`}>
                <button className="text-primary hover:underline" onClick={() => openVoucher(r)}>
                  {r.voucherNo}
                </button>
              </td>
              <td className={`${tdClass} max-w-[260px] truncate`} title={r.description ?? ''}>
                {r.description}
              </td>
              <td className={tdClass}>{r.counterAccount}</td>
              <td className={tdMoney}>{money(r.unitPrice)}</td>
              <td className={tdMoney}>{quantity(r.inQty)}</td>
              <td className={tdMoney}>{money(r.inAmount)}</td>
              <td className={tdMoney}>{quantity(r.outQty)}</td>
              <td className={tdMoney}>{money(r.outAmount)}</td>
              <td className={tdMoney}>{quantity(r.balanceQty, true)}</td>
              <td className={tdMoney}>{money(r.balanceAmount, true)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50/60 font-semibold">
            <td colSpan={6} className={tdClass}>Cộng phát sinh</td>
            <td className={tdMoney}>{quantity(data.totalInQty, true)}</td>
            <td className={tdMoney}>{money(data.totalInAmount, true)}</td>
            <td className={tdMoney}>{quantity(data.totalOutQty, true)}</td>
            <td className={tdMoney}>{money(data.totalOutAmount, true)}</td>
            <td className={tdMoney} />
            <td className={tdMoney} />
          </tr>
          <tr className="bg-slate-50/60 font-semibold">
            <td colSpan={10} className={tdClass}>Số dư cuối kỳ</td>
            <td className={tdMoney}>{quantity(data.closingQty, true)}</td>
            <td className={tdMoney}>{money(data.closingAmount, true)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-10 text-center text-slate-400">{children}</div>
}
