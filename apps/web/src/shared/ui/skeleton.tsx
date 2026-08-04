import { cn } from '@/shared/lib/cn'

// Khối xám nhấp nháy dùng làm placeholder khi đang nạp dữ liệu.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-slate-200/80', className)} />
}
