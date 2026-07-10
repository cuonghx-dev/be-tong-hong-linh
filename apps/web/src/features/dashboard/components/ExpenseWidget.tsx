import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/shared/lib/currency'
import { useExpenseBreakdown } from '../api/useDashboard'
import { DashboardCard, PeriodSelect } from './DashboardCard'
import { CATEGORICAL, toNumber } from './chart-theme'
import { currencyTooltip, yearOptions } from './chart-parts'

// Cơ cấu chi phí trong năm — donut theo nhóm TK chi phí.
export function ExpenseWidget({ className }: { className?: string }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const query = useExpenseBreakdown(year)
  const d = query.data

  const data = (d?.groups ?? [])
    .map((g) => ({ name: g.label, value: toNumber(g.amount) }))
    .filter((g) => g.value > 0)

  return (
    <DashboardCard
      title="Chi phí"
      className={className}
      actions={<PeriodSelect value={year} options={yearOptions()} onChange={setYear} />}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <div className="mb-2 flex items-baseline">
        <span className="text-2xl font-bold tabular-nums text-slate-800">
          {formatCurrency(toNumber(d?.total))}
        </span>
        <span className="ml-1 text-sm text-slate-400">đ</span>
        <span className="ml-3 text-xs font-medium uppercase tracking-wide text-slate-400">Tổng</span>
        <span className="ml-auto text-xs text-slate-400">Đvt: đồng</span>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">Chưa có dữ liệu</div>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="55%" height={230}>
            <PieChart>
              <Tooltip content={currencyTooltip} />
              <Pie isAnimationActive={false}
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="90%"
                paddingAngle={1.5}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Chú giải kèm giá trị — nhận diện không phụ thuộc màu */}
          <ul className="flex-1 space-y-2 text-sm">
            {data.map((g, i) => (
              <li key={g.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORICAL[i % CATEGORICAL.length] }}
                />
                <span className="truncate text-slate-600">{g.name}</span>
                <span className="ml-auto pl-3 tabular-nums text-slate-800">
                  {formatCurrency(g.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}
