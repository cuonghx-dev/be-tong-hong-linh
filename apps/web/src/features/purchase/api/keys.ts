import type { PurchaseVoucherFilter, SupplierFilter } from '@app/shared'

// Query keys phân hệ Mua hàng.
export const purchaseKeys = {
  all: ['purchase'] as const,
  vouchers: (filter: PurchaseVoucherFilter) =>
    [...purchaseKeys.all, 'vouchers', filter] as const,
  voucher: (id: string) => [...purchaseKeys.all, 'voucher', id] as const,
  suppliers: (filter: SupplierFilter) => [...purchaseKeys.all, 'suppliers', filter] as const,
  supplier: (id: string) => [...purchaseKeys.all, 'supplier', id] as const,
}
