import type { BankBalanceFilter, BankReportFilter, BankVoucherFilter } from '@app/shared'

// Query keys phân hệ Tiền gửi.
export const bankKeys = {
  all: ['bank'] as const,
  vouchers: (filter: BankVoucherFilter) => [...bankKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...bankKeys.all, 'voucher', id] as const,
  report: (slug: string, filter: BankReportFilter | BankBalanceFilter) =>
    [...bankKeys.all, 'report', slug, filter] as const,
}
