import { cn } from '@/shared/lib/cn'
import { formatCurrency, parseCurrency } from '@/shared/lib/currency'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

// Input số có phân cách nghìn; lưu number (đồng — không float).
export function MoneyInput({ value, onChange, className, placeholder }: MoneyInputProps) {
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
