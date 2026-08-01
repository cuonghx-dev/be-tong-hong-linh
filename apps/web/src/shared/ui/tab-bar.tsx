import { cn } from '@/shared/lib/cn'

export interface TabItem<K extends string = string> {
  key: K
  label: React.ReactNode
}

interface TabBarProps<K extends string> {
  items: readonly TabItem<K>[]
  value: K
  onChange: (key: K) => void
  /** sm = tab con trong bảng, md = tab bản ghi, lg = tab tiêu đề section, nav = tab điều hướng phân hệ. */
  size?: 'sm' | 'md' | 'lg' | 'nav'
  className?: string
}

const sizeCls = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: '-mb-2 pb-2 text-base font-semibold',
  nav: 'px-3 py-3 text-sm',
}

// Thanh tab gạch chân dùng chung (design.md §5.4). Trước đây 6 chỗ tự dựng với 3 cỡ khác nhau.
//
// KHÔNG dùng Radix Tabs: các form chứng từ bọc nội dung trong <fieldset disabled> ở chế độ
// xem, mà TabsTrigger của Radix là <button> nên sẽ bị fieldset vô hiệu hóa → không xem được
// tab khác. Dùng div + role=tab để vẫn chuyển tab được khi form ở chế độ chỉ xem.
export function TabBar<K extends string>({
  items,
  value,
  onChange,
  size = 'md',
  className,
}: TabBarProps<K>) {
  return (
    <div role="tablist" className={cn('flex items-center', size === 'lg' ? 'gap-6' : 'gap-1', className)}>
      {items.map((t) => (
        <div
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          tabIndex={0}
          onClick={() => onChange(t.key)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onChange(t.key)
            }
          }}
          className={cn(
            'cursor-pointer select-none whitespace-nowrap border-b-2 transition-colors',
            sizeCls[size],
            value === t.key
              ? 'border-primary font-medium text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          {t.label}
        </div>
      ))}
    </div>
  )
}
