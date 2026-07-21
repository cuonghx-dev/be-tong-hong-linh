import type {
  CustomerFilter,
  CustomerReceivableFilter,
  SalesReportFilter,
  SalesVoucherFilter,
} from '@app/shared'

// Query keys phân hệ Bán hàng.
export const salesKeys = {
  all: ['sales'] as const,
  vouchers: (filter: SalesVoucherFilter) => [...salesKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...salesKeys.all, 'voucher', id] as const,
  nextNo: (voucherDate: string, paymentMode: string, paymentMethod: string) =>
    [...salesKeys.all, 'next-no', voucherDate, paymentMode, paymentMethod] as const,
  customers: (filter: CustomerFilter) => [...salesKeys.all, 'customers', filter] as const,
  customer: (id: string) => [...salesKeys.all, 'customer', id] as const,
  receivables: (filter: CustomerReceivableFilter) =>
    [...salesKeys.all, 'receivables', filter] as const,
  openReceivables: (customerId: string) =>
    [...salesKeys.all, 'receivables', 'open', customerId] as const,
  report: (slug: string, filter: SalesReportFilter) =>
    [...salesKeys.all, 'report', slug, filter] as const,
}
