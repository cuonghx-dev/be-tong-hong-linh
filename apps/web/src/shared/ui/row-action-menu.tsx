import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useCan } from '@/features/auth'
import { cn } from '@/shared/lib/cn'
import { domainFromPath } from '@/shared/lib/domain-from-path'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { ChevronDownIcon } from '@/shared/ui/icons'

export interface RowAction {
  label: string
  onClick: () => void
  danger?: boolean
  icon?: ReactNode
  /** Quyền cần có trên domain hiện tại — mặc định 'write' (Sửa/Xóa/Nhân bản). Ghi sổ dùng 'post'. */
  action?: 'write' | 'post'
}

interface Props {
  primaryLabel?: string
  onPrimary: () => void
  items: RowAction[]
}

// Cột "Chức năng": link chính (Xem) + ▾ mở menu (design.md §3.8).
// DropdownMenu của Radix portal ra body → không bị clip/đè bởi cell sticky của bảng.
export function RowActionMenu({ primaryLabel = 'Xem', onPrimary, items: allItems }: Props) {
  const can = useCan()
  const domain = domainFromPath(useLocation().pathname)
  // Lọc thao tác theo quyền trên domain hiện tại (Sửa/Xóa cần write, Ghi sổ cần post).
  const items = domain ? allItems.filter((it) => can(`${domain}:${it.action ?? 'write'}`)) : allItems

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <button className="font-medium text-primary hover:underline" onClick={onPrimary}>
        {primaryLabel}
      </button>
      {items.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Thao tác khác"
            className="grid h-6 w-6 place-items-center rounded text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ChevronDownIcon size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            {items.map((it, i) => (
              <DropdownMenuItem
                key={i}
                onSelect={it.onClick}
                className={cn('gap-2', it.danger && 'text-red-600 focus:bg-red-50 focus:text-red-600')}
              >
                {it.icon}
                {it.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
