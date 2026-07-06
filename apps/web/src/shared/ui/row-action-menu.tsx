import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { ChevronDownIcon } from '@/shared/ui/icons'

export interface RowAction {
  label: string
  onClick: () => void
  danger?: boolean
  icon?: ReactNode
}

interface Props {
  primaryLabel?: string
  onPrimary: () => void
  items: RowAction[]
}

// Cột "Chức năng": link chính (Xem) + ▾ mở menu (design.md §3.8).
// Menu dùng position:fixed → không bị clip bởi overflow của bảng.
export function RowActionMenu({ primaryLabel = 'Xem', onPrimary, items }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // fixed không cuộn theo → đóng khi cuộn/resize.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <button className="font-medium text-primary hover:underline" onClick={onPrimary}>
        {primaryLabel}
      </button>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Thao tác khác"
        aria-expanded={open}
        className="grid h-6 w-6 place-items-center rounded text-primary hover:bg-primary/10"
      >
        <ChevronDownIcon size={14} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-50 min-w-[160px] overflow-hidden rounded-md border border-border bg-white py-1 shadow-lg"
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false)
                it.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50',
                it.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700',
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
