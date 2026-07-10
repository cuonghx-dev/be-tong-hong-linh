import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/shared/lib/currency'
import { useCashflow } from '../api/useDashboard'
import { DashboardCard, PeriodSelect } from './DashboardCard'
import { AXIS_TICK, GRID_STROKE, MONTH_LABELS, SERIES, toNumber } from './chart-theme'
import { ChartLegend, currencyTooltip, yearOptions } from './chart-parts'

// Dòng tiền: cột Thu (dương) / Chi (âm) + đường Tồn lũy kế.
export function CashflowWidget({ className }: { className?: string }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const query = useCashflow(year)
  const d = query.data

  const data = (d?.months ?? []).map((m) => ({
    name: MONTH_LABELS[m.month - 1],
    Thu: toNumber(m.inflow),
    Chi: -toNumber(m.outflow), // vẽ xuống dưới trục 0 như MISA
    Tồn: toNumber(m.balance),
  }))

  return (
    <DashboardCard
      title="Dòng tiền"
      className={className}
      actions={<PeriodSelect value={year} options={yearOptions()} onChange={setYear} />}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <Headline label="Tổng thu" value={d?.totalInflow} />
        <Headline label="Tổng chi" value={d?.totalOutflow} />
        <Headline label="Tồn" value={d?.balance} />
        <span className="ml-auto text-xs text-slate-400">Đvt: đồng</span>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} stackOffset="sign">
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={100}
            tickFormatter={(v: number) => (v < 0 ? `(${formatCurrency(-v)})` : formatCurrency(v))}
          />
          <Tooltip content={currencyTooltip} />
          <Bar isAnimationActive={false} dataKey="Thu" fill={SERIES.revenue} barSize={12} radius={[4, 4, 0, 0]} />
          <Bar isAnimationActive={false} dataKey="Chi" fill={SERIES.expense} barSize={12} radius={[0, 0, 4, 4]} />
          <Line isAnimationActive={false} dataKey="Tồn" stroke={SERIES.profit} strokeWidth={2} dot={{ r: 3, fill: SERIES.profit, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <ChartLegend
        items={[
          { label: 'Thu', color: SERIES.revenue },
          { label: 'Chi', color: SERIES.expense },
          { label: 'Tồn', color: SERIES.profit },
        ]}
      />
    </DashboardCard>
  )
}

function Headline({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-lg font-bold tabular-nums text-slate-800">
        {formatCurrency(toNumber(value))}
      </span>
      <span className="ml-1 text-xs text-slate-400">đ</span>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}
