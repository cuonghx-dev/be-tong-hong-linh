import type { UseQueryResult } from '@tanstack/react-query'
import type { DebtAgingDto } from '@app/shared'
import { formatCurrency } from '@/shared/lib/currency'
import { usePayableAging, useReceivableAging } from '../api/useDashboard'
import { DashboardCard } from './DashboardCard'
import { OVERDUE_COLOR, toNumber } from './chart-theme'

export function ReceivableAgingWidget({ className }: { className?: string }) {
  return <AgingCard title="Nợ phải thu theo hạn" query={useReceivableAging()} className={className} />
}

export function PayableAgingWidget({ className }: { className?: string }) {
  return <AgingCard title="Nợ phải trả theo hạn" query={usePayableAging()} className={className} />
}

// Tổng nợ + tách Quá hạn / Trong hạn kèm thanh tỷ trọng.
function AgingCard({
  title,
  query,
  className,
}: {
  title: string
  query: UseQueryResult<DebtAgingDto>
  className?: string
}) {
  const total = toNumber(query.data?.total)
  const overdue = toNumber(query.data?.overdue)
  const current = toNumber(query.data?.current)
  const overduePct = total > 0 ? (overdue / total) * 100 : 0

  return (
    <DashboardCard
      title={title}
      className={className}
      updatedAt={query.dataUpdatedAt}
      onReload={() => query.refetch()}
      isFetching={query.isFetching}
    >
      <div className="text-2xl font-bold tabular-nums text-slate-800">
        {formatCurrency(total)} <span className="text-sm font-normal text-slate-400">đ</span>
      </div>
      <div className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-400">Tổng</div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-semibold tabular-nums" style={{ color: OVERDUE_COLOR }}>
            {formatCurrency(overdue)} đ
          </div>
          <div className="text-xs uppercase text-slate-400">Quá hạn</div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums text-slate-800">{formatCurrency(current)} đ</div>
          <div className="text-xs uppercase text-slate-400">Trong hạn</div>
        </div>
      </div>

      {/* Thanh tỷ trọng quá hạn / trong hạn (khe 2px giữa 2 phần) */}
      <div className="mt-2 flex h-4 gap-0.5 overflow-hidden rounded">
        {overdue > 0 && (
          <div style={{ width: `${overduePct}%`, backgroundColor: OVERDUE_COLOR }} className="rounded-sm" />
        )}
        {current > 0 && <div className="flex-1 rounded-sm bg-slate-200" />}
        {total === 0 && <div className="flex-1 rounded-sm bg-slate-100" />}
      </div>
    </DashboardCard>
  )
}
