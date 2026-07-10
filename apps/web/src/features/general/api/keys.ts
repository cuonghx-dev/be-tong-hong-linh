import type { GeneralVoucherFilter } from '@app/shared'

// Query keys phân hệ Tổng hợp.
export const generalKeys = {
  all: ['general'] as const,
  vouchers: (filter: GeneralVoucherFilter) => [...generalKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...generalKeys.all, 'voucher', id] as const,
}
