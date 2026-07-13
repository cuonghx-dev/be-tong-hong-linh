import type {
  PurchaseReportFilter,
  PurchaseVoucherFilter,
  SupplierFilter,
  SupplierPayableFilter,
} from '@app/shared'

// Query keys phân hệ Mua hàng.
export const purchaseKeys = {
  all: ['purchase'] as const,
  vouchers: (filter: PurchaseVoucherFilter) =>
    [...purchaseKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...purchaseKeys.all, 'voucher', id] as const,
  suppliers: (filter: SupplierFilter) => [...purchaseKeys.all, 'suppliers', filter] as const,
  supplier: (id: string) => [...purchaseKeys.all, 'supplier', id] as const,
  payables: (filter: SupplierPayableFilter) => [...purchaseKeys.all, 'payables', filter] as const,
  report: (slug: string, filter: PurchaseReportFilter) =>
    [...purchaseKeys.all, 'report', slug, filter] as const,
}
