import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl' | 'full'
}

const sizeClass = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-6xl',
  full: 'max-w-[96vw]',
}

// Modal dùng chung — bọc shadcn Dialog (Radix) để có focus trap, khóa scroll nền,
// Esc/click nền, aria-modal. API giữ nguyên bản tự chế trước đó (32 call site).
export function Modal({ open, onClose, title, children, footer, size = 'lg' }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        // Không có mô tả riêng — nội dung do children quyết định. Báo Radix biết để
        // không cảnh báo thiếu Description (và không chèn text trùng tiêu đề).
        aria-describedby={undefined}
        className={cn(
          // max-h chừa lề như overlay cũ (p-4 / sm:p-6) để dialog luôn nằm gọn trong màn hình.
          'flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-0 rounded-lg border-border bg-white p-0 sm:max-h-[calc(100dvh-3rem)]',
          sizeClass[size],
        )}
      >
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3 pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-slate-800">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
