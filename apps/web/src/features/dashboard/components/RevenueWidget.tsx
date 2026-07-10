import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/shared/lib/currency'
import { useProfitLoss } from '../api/useDashboard'
import { DashboardCard, PeriodSelect } from './DashboardCard'
import { AXIS_TICK, GRID_STROKE, MONTH_LABELS, SERIES, toNumber } from './chart-theme'
import { currencyTooltip, yearOptions } from './chart-parts'

// Doanh thu theo tháng (đường) — 1 series nên không cần chú giải, tiêu đề đã đặt tên.
export function RevenueWidget({ className }: { className?: string }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const query = useProfitLoss(year)
  const d = query.data

  const data = (d?.months ?? []).map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    'Doanh thu': toNumber(m.revenue),
  }))

  return (
    <DashboardCard
      title="Doanh thu"
      className={className}
      actions={<PeriodSelect value={year} options={yearOptions()} onChange={setYear} />}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <div className="mb-2 flex items-baseline">
        <span className="text-lg font-bold tabular-nums text-slate-800">
          {formatCurrency(toNumber(d?.totalRevenue))}
        </span>
        <span className="ml-1 text-xs text-slate-400">đ</span>
        <span className="ml-3 text-xs font-medium uppercase tracking-wide text-slate-400">Tổng</span>
        <span className="ml-auto text-xs text-slate-400">Đvt: đồng</span>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={92} tickFormatter={formatCurrency} />
          <Tooltip content={currencyTooltip} />
          <Line isAnimationActive={false}
            dataKey="Doanh thu"
            stroke={SERIES.revenue}
            strokeWidth={2}
            dot={{ r: 3, fill: '#fff', stroke: SERIES.revenue, strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </DashboardCard>
  )
}
