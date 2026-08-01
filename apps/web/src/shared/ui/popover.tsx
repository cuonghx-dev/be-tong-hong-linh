import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

import { cn } from '@/shared/lib/cn'

const PopoverRoot = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-lg border border-border bg-white p-4 text-slate-800 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

// Popover neo dưới trigger (design.md §3.7) — API render-prop dùng cho các bộ lọc.
// Chạy trên Radix Popover: dismiss layer của Radix hiểu portal lồng nhau nên click
// vào dropdown Select bên trong không còn làm popover tự đóng (không cần hack
// data-radix-popper-content-wrapper như bản tự chế trước).
export function Popover({ trigger, children, align = 'left', className }: PopoverProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">{trigger({ open, toggle: () => setOpen((v) => !v) })}</div>
      </PopoverAnchor>
      <PopoverContent
        align={align === 'right' ? 'end' : 'start'}
        sideOffset={4}
        className={cn('w-auto', className)}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {children(() => setOpen(false))}
      </PopoverContent>
    </PopoverRoot>
  )
}

export { PopoverRoot, PopoverTrigger, PopoverContent, PopoverAnchor }
