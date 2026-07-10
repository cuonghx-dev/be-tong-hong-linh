import { formatCurrency, parseCurrency } from '@/shared/lib/currency'
import { cn } from '@/shared/lib/cn'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

// Input tiền tệ: hiển thị phân cách nghìn, lưu number (đồng — không float).
export function AmountInput({ value, onChange, className, placeholder }: AmountInputProps) {
  return (
    <input
      inputMode="numeric"
      value={value ? formatCurrency(value) : ''}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(parseCurrency(e.target.value) || 0)}
      className={cn(
        'h-8 w-full rounded-md border border-border px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30',
        className,
      )}
    />
  )
}
