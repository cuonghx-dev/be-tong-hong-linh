import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Label } from '@/shared/ui/label'

interface FieldProps {
  label: ReactNode
  /** Hiện dấu * đỏ sau nhãn. */
  required?: boolean
  /** Thông báo lỗi từ react-hook-form (`formState.errors.x?.message`). */
  error?: string
  /** id của control con — gắn để click nhãn focus vào control. */
  htmlFor?: string
  className?: string
  labelClassName?: string
  children: ReactNode
}

// Wrapper nhãn + control + lỗi dùng chung cho MỌI form (danh mục, chứng từ, bộ lọc).
// Trước đây 33 file tự khai 1 bản `Field` riêng với 4 style nhãn khác nhau.
export function Field({
  label,
  required,
  error,
  htmlFor,
  className,
  labelClassName,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor} className={cn('text-xs font-medium text-slate-500', labelClassName)}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
