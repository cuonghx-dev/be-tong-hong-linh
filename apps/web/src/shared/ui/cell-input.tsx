import { forwardRef, type ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'
import { Input } from '@/shared/ui/input'

// Ô nhập trong bảng chi tiết chứng từ — kiểu spreadsheet: viền ẩn, hiện khi hover/focus.
// Cùng kiểu với accountCellCls / warehouseCellCls của các picker, để 1 dòng chứng từ
// không lẫn ô có viền và ô không viền.
export const cellInputCls =
  'h-8 rounded border-transparent bg-transparent px-2 transition-colors hover:border-slate-200 focus-visible:border-primary/50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20'

export const CellInput = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} className={cn(cellInputCls, className)} {...props} />
  ),
)
CellInput.displayName = 'CellInput'
