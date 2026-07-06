import type { CustomerFilter, InvoiceFilter, SalesVoucherFilter } from '@app/shared'

// Query keys phân hệ Bán hàng.
export const salesKeys = {
  all: ['sales'] as const,
  vouchers: (filter: SalesVoucherFilter) => [...salesKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...salesKeys.all, 'voucher', id] as const,
  invoices: (filter: InvoiceFilter) => [...salesKeys.all, 'invoices', filter] as const,
  invoice: (id: string) => [...salesKeys.all, 'invoice', id] as const,
  customers: (filter: CustomerFilter) => [...salesKeys.all, 'customers', filter] as const,
  customer: (id: string) => [...salesKeys.all, 'customer', id] as const,
  receivables: (filter: CustomerFilter) => [...salesKeys.all, 'receivables', filter] as const,
}
