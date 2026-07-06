import type { BankVoucherFilter } from '@app/shared'

// Query keys phân hệ Tiền gửi.
export const bankKeys = {
  all: ['bank'] as const,
  vouchers: (filter: BankVoucherFilter) => [...bankKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...bankKeys.all, 'voucher', id] as const,
}
