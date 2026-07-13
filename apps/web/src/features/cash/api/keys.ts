import type { CashReportFilter, CashVoucherFilter } from '@app/shared'

// Query keys phân hệ Tiền mặt.
export const cashKeys = {
  all: ['cash'] as const,
  vouchers: (filter: CashVoucherFilter) => [...cashKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...cashKeys.all, 'voucher', id] as const,
  nextNo: (type: string, voucherDate: string) =>
    [...cashKeys.all, 'next-no', type, voucherDate] as const,
  report: (slug: string, filter: CashReportFilter) =>
    [...cashKeys.all, 'report', slug, filter] as const,
}
