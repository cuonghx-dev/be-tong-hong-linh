import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useCan } from '@/features/auth'
import { domainFromPath } from '@/shared/lib/domain-from-path'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { ChevronDownIcon, ExcelIcon, PlusIcon } from '@/shared/ui/icons'

export interface AddMenuAction {
  label: string
  onClick: () => void
  icon?: ReactNode
}

interface AddMenuProps {
  /** Nhãn nút chính, mặc định "Thêm". */
  label?: string
  /** Các thao tác tạo mới (hiện đầu menu). */
  actions: AddMenuAction[]
  /** Kích hoạt chọn file Excel để nhập khẩu. */
  onImportExcel: () => void
  /** Đang nhập khẩu → khóa lựa chọn "Nhập Excel". */
  importing?: boolean
}

// Nút "＋ Thêm ▾" dùng chung cho mọi bảng danh sách (design.md §3.2).
// Gộp các thao tác tạo mới + "Nhập Excel" vào 1 menu — thay cho nút Excel riêng lẻ.
export function AddMenu({ label = 'Thêm', actions, onImportExcel, importing }: AddMenuProps) {
  const can = useCan()
  const domain = domainFromPath(useLocation().pathname)
  // Vai trò chỉ xem (viewer, thủ quỹ) → ẩn hẳn nút Thêm của phân hệ đó.
  if (domain && !can(`${domain}:write`)) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <PlusIcon size={16} />
          {label}
          <ChevronDownIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {actions.map((a, i) => (
          <DropdownMenuItem key={i} onSelect={a.onClick} className="gap-2">
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
        {actions.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={onImportExcel} disabled={importing} className="gap-2">
          <ExcelIcon size={16} />
          {importing ? 'Đang nhập…' : 'Nhập Excel'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
