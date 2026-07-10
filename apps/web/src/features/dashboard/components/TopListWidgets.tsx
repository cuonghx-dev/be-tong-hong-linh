import { useState } from 'react'
import { formatCurrency } from '@/shared/lib/currency'
import { useInventorySummary, useTopSelling } from '../api/useDashboard'
import { DashboardCard, PeriodSelect } from './DashboardCard'
import { CATEGORICAL, toNumber } from './chart-theme'
import { yearOptions } from './chart-parts'

// Định dạng số lượng: tối đa 2 số lẻ, phân cách vi-VN.
const qtyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

// Hàng hóa tồn kho — top mặt hàng theo giá trị tồn.
export function InventoryWidget({ className }: { className?: string }) {
  const query = useInventorySummary()
  const d = query.data

  return (
    <DashboardCard
      title="Hàng hóa tồn kho"
      className={className}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <Headline value={d?.totalValue} label="Tổng giá trị" />
      <ItemTable
        headers={['Tên', 'Số lượng', 'Giá trị']}
        rows={(d?.items ?? []).map((it) => ({
          name: it.itemName,
          cols: [qtyFormatter.format(toNumber(it.quantity)), formatCurrency(toNumber(it.value))],
        }))}
      />
    </DashboardCard>
  )
}

// Mặt hàng bán chạy — top theo doanh thu trong năm.
export function TopSellingWidget({ className }: { className?: string }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const query = useTopSelling(year)
  const d = query.data

  return (
    <DashboardCard
      title="Mặt hàng bán chạy"
      className={className}
      actions={<PeriodSelect value={year} options={yearOptions()} onChange={setYear} />}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <Headline value={d?.totalRevenue} label="Tổng doanh thu" />
      <ItemTable
        headers={['Tên', 'Số lượng', 'Doanh thu']}
        rows={(d?.items ?? []).map((it) => ({
          name: it.itemName,
          cols: [qtyFormatter.format(toNumber(it.quantity)), formatCurrency(toNumber(it.revenue))],
        }))}
      />
    </DashboardCard>
  )
}

function Headline({ value, label }: { value?: string; label: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline">
        <span className="text-2xl font-bold tabular-nums text-slate-800">
          {formatCurrency(toNumber(value))}
        </span>
        <span className="ml-1 text-sm text-slate-400">đ</span>
        <span className="ml-auto text-xs text-slate-400">Đvt: đồng</span>
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

// Bảng top mặt hàng: ô màu theo thứ tự cố định + 2 cột số căn phải.
function ItemTable({
  headers,
  rows,
}: {
  headers: [string, string, string]
  rows: { name: string; cols: [string, string] }[]
}) {
  if (!rows.length) {
    return <div className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</div>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-400">
          <th className="pb-2 text-left font-medium">{headers[0]}</th>
          <th className="pb-2 text-right font-medium">{headers[1]}</th>
          <th className="pb-2 text-right font-medium">{headers[2]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name} className="border-t border-dashed border-border">
            <td className="flex items-center gap-2 py-2 text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORICAL[i % CATEGORICAL.length] }}
              />
              <span className="truncate">{r.name}</span>
            </td>
            <td className="py-2 text-right tabular-nums text-slate-700">{r.cols[0]}</td>
            <td className="py-2 text-right tabular-nums text-slate-700">{r.cols[1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
