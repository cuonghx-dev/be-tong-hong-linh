import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { XIcon } from '@/shared/ui/icons'

interface RecordPageShellProps {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Đè style header (vd. nền teal của chứng từ thu/chi). */
  headerClassName?: string
  /** Đè style vùng thân (vd. `p-0` để form tự quản padding từng vùng màu). */
  contentClassName?: string
}

// Khung trang chi tiết/chứng từ full-page (§5 design.md).
// Đè cả Sidebar/Header: page header sticky top + thân giữa (form tự cuộn + action bar).
export function RecordPageShell({
  title,
  subtitle,
  onClose,
  children,
  headerClassName,
  contentClassName,
}: RecordPageShellProps) {
  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Page header */}
      <header
        className={cn(
          'flex h-14 shrink-0 items-center gap-3 border-b border-border px-6',
          headerClassName,
        )}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-lg font-bold text-slate-800">{title}</h1>
          {subtitle && <span className="truncate text-sm text-slate-400">{subtitle}</span>}
        </div>
        <button
          onClick={onClose}
          className="ml-auto grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Đóng"
        >
          <XIcon size={18} />
        </button>
      </header>

      {/* Thân giữa — form tự quản lý cuộn + action bar sticky bottom */}
      <div className={cn('flex-1 overflow-hidden px-6 py-5', contentClassName)}>{children}</div>
    </div>
  )
}
