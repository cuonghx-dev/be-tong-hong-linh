import { cn } from '@/shared/lib/cn'
import { Skeleton } from './skeleton'

interface RecordFormSkeletonProps {
  /** Form tự dựng page header (sales/purchase/inventory) → vẽ luôn thanh header giả. */
  withHeader?: boolean
  /** Số dòng giả của bảng chi tiết. */
  rows?: number
  /** Số trường giả ở vùng thông tin chung. */
  fields?: number
}

// Khung chờ cho trang chứng từ full-page (§5 design.md) — giữ đúng 2 lớp màu của
// form thật (thông tin chung nền primary nhạt + bảng dòng nền trắng) để không
// nhảy layout khi dữ liệu về. Dùng khi query chứng từ đang nạp lần đầu.
export function RecordFormSkeleton({
  withHeader = false,
  rows = 4,
  fields = 6,
}: RecordFormSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      // Form tự dựng header thì chiếm trọn màn hình; form nằm trong RecordPageShell thì h-full.
      className={cn('flex flex-col bg-white', withHeader ? 'h-screen' : 'h-full')}
    >
      <span className="sr-only">Đang tải chứng từ…</span>

      {withHeader && (
        <div className="flex h-14 shrink-0 items-center gap-3 bg-primary/5 px-6">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="ml-auto h-8 w-8 rounded-md" />
        </div>
      )}

      {/* Vùng thông tin chung */}
      <div className="space-y-3 bg-primary/5 px-6 pb-5 pt-2">
        <Skeleton className="h-9 w-60" />
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div className="grid min-w-0 flex-1 basis-[520px] grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="w-52 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="mt-4 h-3 w-24" />
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
      </div>

      {/* Bảng dòng chi tiết */}
      <div className="flex-1 space-y-2 px-6 pt-4">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>

      {/* Thanh action đáy */}
      <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-border px-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}
