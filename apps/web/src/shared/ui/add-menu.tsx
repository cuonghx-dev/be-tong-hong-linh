import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useCan } from '@/features/auth'
import { domainFromPath } from '@/shared/lib/domain-from-path'
import { Button } from '@/shared/ui/button'
import { ChevronDownIcon, ExcelIcon, PlusIcon } from '@/shared/ui/icons'
import { Popover } from '@/shared/ui/popover'

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
    <Popover
      align="right"
      className="min-w-[200px] p-1"
      trigger={({ open, toggle }) => (
        <Button size="sm" onClick={toggle} aria-expanded={open}>
          <PlusIcon size={16} />
          {label}
          <ChevronDownIcon size={14} />
        </Button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                close()
                a.onClick()
              }}
              className="flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {a.icon}
              {a.label}
            </button>
          ))}
          {actions.length > 0 && <div className="my-1 border-t border-border" />}
          <button
            onClick={() => {
              close()
              onImportExcel()
            }}
            disabled={importing}
            className="flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ExcelIcon size={16} />
            {importing ? 'Đang nhập…' : 'Nhập Excel'}
          </button>
        </div>
      )}
    </Popover>
  )
}
