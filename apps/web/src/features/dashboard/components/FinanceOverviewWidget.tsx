import type { DashboardPeriod } from '@app/shared'
import { useState } from 'react'
import { formatCurrency } from '@/shared/lib/currency'
import { cn } from '@/shared/lib/cn'
import { useFinanceOverview } from '../api/useDashboard'
import { DashboardCard, PeriodSelect } from './DashboardCard'
import { toNumber } from './chart-theme'

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
]

// Tình hình tài chính: tổng tiền + công nợ (số dư) và doanh thu/chi phí/lợi nhuận (trong kỳ).
export function FinanceOverviewWidget({ className }: { className?: string }) {
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const query = useFinanceOverview(period)
  const d = query.data

  const totalMoney = toNumber(d?.cash) + toNumber(d?.bank)

  return (
    <DashboardCard
      title="Tình hình tài chính"
      className={className}
      actions={<PeriodSelect value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <div className="mb-1 text-right text-xs text-slate-400">Đvt: đồng</div>
      <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        <div>
          <Row label="TỔNG TIỀN" value={totalMoney} strongLabel />
          <Row label="Tiền mặt" value={toNumber(d?.cash)} indent link />
          <Row label="Tiền gửi" value={toNumber(d?.bank)} indent link />
          <Row label="Phải thu" value={toNumber(d?.receivable)} link />
          <Row label="Phải trả" value={toNumber(d?.payable)} negative />
        </div>
        <div>
          <Row label="Doanh thu" value={toNumber(d?.revenue)} link />
          <Row label="Chi phí" value={toNumber(d?.expense)} link />
          <Row label="Lợi nhuận" value={toNumber(d?.profit)} link />
          <Row label="Hàng tồn kho" value={toNumber(d?.inventory)} link />
        </div>
      </div>
    </DashboardCard>
  )
}

function Row({
  label,
  value,
  indent,
  link,
  strongLabel,
  negative,
}: {
  label: string
  value: number
  indent?: boolean
  link?: boolean
  strongLabel?: boolean
  negative?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 border-b border-dashed border-border py-2.5',
        indent && 'pl-4',
      )}
    >
      <span className={cn('text-sm text-slate-600', strongLabel && 'font-semibold text-slate-800')}>
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          negative ? 'text-red-600' : link ? 'text-sky-600' : 'text-slate-800',
        )}
      >
        {negative && value !== 0 ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  )
}
