import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { RefreshIcon } from '@/shared/ui/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Card } from '@/shared/ui/card'

// Khung widget Tổng quan: tiêu đề + control bên phải, footer "Số liệu tính đến / Tải lại".
export function DashboardCard({
  title,
  actions,
  updatedAt,
  onReload,
  isFetching,
  className,
  children,
}: {
  title: string
  actions?: ReactNode
  updatedAt?: number // dataUpdatedAt từ react-query (ms epoch)
  onReload?: () => void
  isFetching?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('flex flex-col p-4', className)}>
      <header className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 truncate text-base font-semibold text-slate-800">{title}</h2>
        {actions}
        <button
          type="button"
          title="Tải lại"
          onClick={onReload}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
        >
          <RefreshIcon size={15} className={isFetching ? 'animate-spin' : undefined} />
        </button>
      </header>

      <div className="min-h-0 flex-1">{children}</div>

      <footer className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        {updatedAt ? (
          <span>
            Số liệu tính đến:{' '}
            {new Date(updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        <button type="button" onClick={onReload} className="text-sky-600 hover:underline">
          Tải lại
        </button>
      </footer>
    </Card>
  )
}

// Dropdown kỳ thống kê (Tháng này / Năm nay…) đặt ở góc phải header widget.
export function PeriodSelect<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => {
        const match = options.find((o) => String(o.value) === v)
        if (match) onChange(match.value)
      }}
    >
      <SelectTrigger className="h-auto w-auto gap-1 border-transparent bg-transparent px-2 py-1 text-slate-600 shadow-none hover:border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
