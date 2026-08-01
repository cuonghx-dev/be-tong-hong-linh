import * as React from "react"

import { cn } from "@/shared/lib/cn"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // bg-white (không bg-transparent): record page có lớp nền tint bg-primary/5,
          // input trong suốt sẽ ăn màu nền — xem docs/design.md §5.
          "flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-slate-800 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
