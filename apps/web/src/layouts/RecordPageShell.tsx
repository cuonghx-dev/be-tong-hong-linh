import type { ReactNode } from 'react'

interface RecordPageShellProps {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
}

// Khung trang chi tiết/chứng từ full-page (§5 design.md).
// Đè cả Sidebar/Header: page header sticky top + thân giữa (form tự cuộn + action bar).
export function RecordPageShell({ title, subtitle, onClose, children }: RecordPageShellProps) {
  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Page header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-lg font-bold text-slate-800">{title}</h1>
          {subtitle && <span className="truncate text-sm text-slate-400">{subtitle}</span>}
        </div>
        <button
          onClick={onClose}
          className="ml-auto grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng"
        >
          ✕
        </button>
      </header>

      {/* Thân giữa — form tự quản lý cuộn + action bar sticky bottom */}
      <div className="flex-1 overflow-hidden p-4">{children}</div>
    </div>
  )
}
