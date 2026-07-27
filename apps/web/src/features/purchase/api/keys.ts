import type { PurchaseReportFilter, PurchaseVoucherFilter, SupplierFilter } from '@app/shared'

// Query keys phân hệ Mua hàng.
export const purchaseKeys = {
  all: ['purchase'] as const,
  vouchers: (filter: PurchaseVoucherFilter) =>
    [...purchaseKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...purchaseKeys.all, 'voucher', id] as const,
  nextNo: (type: string, voucherDate: string, paymentMode: string) =>
    [...purchaseKeys.all, 'next-no', type, voucherDate, paymentMode] as const,
  costVouchers: (keyword: string) => [...purchaseKeys.all, 'cost-vouchers', keyword] as const,
  suppliers: (filter: SupplierFilter) => [...purchaseKeys.all, 'suppliers', filter] as const,
  supplier: (id: string) => [...purchaseKeys.all, 'supplier', id] as const,
  report: (slug: string, filter: PurchaseReportFilter) =>
    [...purchaseKeys.all, 'report', slug, filter] as const,
}
