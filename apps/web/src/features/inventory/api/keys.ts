import type { GoodsIssueFilter, InventoryReceiptFilter } from '@app/shared'

// Query keys phân hệ Kho — Nhập kho + Xuất kho.
export const inventoryKeys = {
  all: ['inventory'] as const,
  receipts: (filter: InventoryReceiptFilter) =>
    [...inventoryKeys.all, 'receipts', filter] as const,
  receipt: (id: string) => [...inventoryKeys.all, 'receipt', id] as const,
  issues: (filter: GoodsIssueFilter) => [...inventoryKeys.all, 'issues', filter] as const,
  issue: (id: string) => [...inventoryKeys.all, 'issue', id] as const,
}
