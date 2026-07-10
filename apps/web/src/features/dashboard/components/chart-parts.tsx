import type { TooltipProps } from 'recharts'
import { formatCurrency } from '@/shared/lib/currency'

// Chọn năm thống kê: năm nay + 2 năm trước.
export function yearOptions(): { value: number; label: string }[] {
  const y = new Date().getFullYear()
  return [
    { value: y, label: 'Năm nay' },
    { value: y - 1, label: `Năm ${y - 1}` },
    { value: y - 2, label: `Năm ${y - 2}` },
  ]
}

// Tooltip chung: tên tháng + từng series định dạng tiền vi-VN.
export function currencyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-slate-700">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? p.stroke }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="ml-auto pl-4 font-semibold tabular-nums text-slate-800">
            {fmtSigned(Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

// Số âm hiển thị kiểu kế toán: (1.234) thay vì -1.234.
function fmtSigned(v: number): string {
  return v < 0 ? `(${formatCurrency(-v)})` : formatCurrency(v)
}

// Chú giải nằm dưới biểu đồ — luôn hiển thị khi ≥ 2 series.
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
