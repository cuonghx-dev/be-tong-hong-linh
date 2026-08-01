import { cn } from '@/shared/lib/cn'
import { formatCurrency, parseCurrency } from '@/shared/lib/currency'
import { Input } from '@/shared/ui/input'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

// Input tiền tệ: hiển thị phân cách nghìn, lưu number (đồng — không float).
// Trước đây bị copy thành 7 bản y hệt (AmountInput ở cash/bank/general/sales/opening-balance,
// MoneyInput ở purchase/inventory) — gộp về đây.
export function AmountInput({ value, onChange, className, placeholder }: AmountInputProps) {
  return (
    <Input
      inputMode="numeric"
      value={value ? formatCurrency(value) : ''}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(parseCurrency(e.target.value) || 0)}
      className={cn('h-8 px-2 text-right tabular-nums', className)}
    />
  )
}
