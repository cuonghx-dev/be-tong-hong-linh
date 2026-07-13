import type { GoodsIssueFilter, InventoryReceiptFilter } from '@app/shared'

// Query keys phân hệ Kho — Nhập kho + Xuất kho + Báo cáo.
export const inventoryKeys = {
  all: ['inventory'] as const,
  receipts: (filter: InventoryReceiptFilter) =>
    [...inventoryKeys.all, 'receipts', filter] as const,
  receipt: (id: string) => [...inventoryKeys.all, 'receipt', id] as const,
  receiptNextNo: () => [...inventoryKeys.all, 'receipt-next-no'] as const,
  issues: (filter: GoodsIssueFilter) => [...inventoryKeys.all, 'issues', filter] as const,
  issue: (id: string) => [...inventoryKeys.all, 'issue', id] as const,
  issueNextNo: (voucherDate: string) =>
    [...inventoryKeys.all, 'issue-next-no', voucherDate] as const,
  report: (slug: string, filter: unknown) =>
    [...inventoryKeys.all, 'report', slug, filter] as const,
}
