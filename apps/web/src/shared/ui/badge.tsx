import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs transition-colors',
  {
    variants: {
      variant: {
        // Trạng thái bản ghi trong bảng danh mục/chứng từ.
        success: 'bg-emerald-50 text-emerald-700',
        muted: 'bg-slate-100 text-slate-500',
        warning: 'bg-amber-50 text-amber-700',
        danger: 'bg-red-50 text-red-700',
        info: 'bg-primary/10 text-primary',
        // Pill đếm số (vd số bộ lọc đang áp dụng).
        // leading-none bắt buộc: text-[10px] loại text-xs khỏi class (mất line-height 1rem),
        // badge sẽ thừa kế leading 20px của Button → số tụt xuống đáy pill 16px.
        count: 'ml-1 grid h-4 min-w-4 place-items-center bg-primary px-1 py-0 text-[10px] leading-none text-white',
      },
    },
    defaultVariants: { variant: 'muted' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
