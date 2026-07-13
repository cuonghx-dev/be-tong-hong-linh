import { CHART_OF_ACCOUNTS, GoodsIssueCategory, InventoryReceiptType } from '@app/shared'

// Nhãn hiển thị loại chứng từ Phiếu nhập kho (đối chiếu dropdown "Loại chứng từ" MISA).
export const RECEIPT_TYPE_LABEL: Record<InventoryReceiptType, string> = {
  [InventoryReceiptType.Purchase]: 'Mua hàng trong nước nhập kho',
  [InventoryReceiptType.FinishedGoods]: 'Nhập kho thành phẩm sản xuất',
  [InventoryReceiptType.SalesReturn]: 'Nhập kho hàng bán bị trả lại',
  [InventoryReceiptType.Other]: 'Khác (NVL thừa, HH thuê gia công, …)',
}

// Nhãn ngắn cho dropdown chọn khi tạo mới (kèm số thứ tự như form MISA).
export const RECEIPT_TYPE_OPTIONS: { type: InventoryReceiptType; label: string }[] = [
  { type: InventoryReceiptType.Purchase, label: '1. Mua hàng trong nước nhập kho' },
  { type: InventoryReceiptType.FinishedGoods, label: '2. Thành phẩm sản xuất' },
  { type: InventoryReceiptType.SalesReturn, label: '3. Hàng bán bị trả lại' },
  { type: InventoryReceiptType.Other, label: '4. Khác (NVL thừa, HH thuê gia công, …)' },
]

// Định khoản TK Nợ (kho) mặc định theo loại phiếu (đồng bộ receipt.service.ts).
export function defaultDebitAccount(type: InventoryReceiptType): string {
  switch (type) {
    case InventoryReceiptType.FinishedGoods:
      return CHART_OF_ACCOUNTS.FINISHED_GOODS
    case InventoryReceiptType.Purchase:
    case InventoryReceiptType.SalesReturn:
      return CHART_OF_ACCOUNTS.GOODS
    default:
      return CHART_OF_ACCOUNTS.MATERIAL
  }
}

// Định khoản TK Có (đối ứng) mặc định theo loại phiếu (đồng bộ receipt.service.ts).
export function defaultCreditAccount(type: InventoryReceiptType): string {
  switch (type) {
    case InventoryReceiptType.Purchase:
      return CHART_OF_ACCOUNTS.PAYABLE
    case InventoryReceiptType.FinishedGoods:
      return CHART_OF_ACCOUNTS.WIP
    case InventoryReceiptType.SalesReturn:
      return CHART_OF_ACCOUNTS.COGS
    default:
      return ''
  }
}

// ── Xuất kho ─────────────────────────────────────────────────────────────────

// Nhãn hiển thị lý do xuất kho (đối chiếu dropdown "Lý do xuất" MISA).
export const GOODS_ISSUE_CATEGORY_LABEL: Record<GoodsIssueCategory, string> = {
  [GoodsIssueCategory.Sales]: 'Xuất kho bán hàng',
  [GoodsIssueCategory.Production]: 'Xuất kho cho sản xuất',
  [GoodsIssueCategory.Other]: 'Xuất kho khác',
}

// Nhãn ngắn cho dropdown chọn khi tạo mới (kèm số thứ tự như form MISA).
export const GOODS_ISSUE_CATEGORY_OPTIONS: { category: GoodsIssueCategory; label: string }[] = [
  { category: GoodsIssueCategory.Sales, label: '1. Bán hàng' },
  { category: GoodsIssueCategory.Production, label: '2. Sản xuất' },
  { category: GoodsIssueCategory.Other, label: '3. Khác' },
]

// Định khoản TK Nợ mặc định theo lý do xuất (đồng bộ goods-issue.service.ts):
//   bán hàng/khác → 632 (giá vốn); sản xuất → 621 (CP NVL trực tiếp).
export function issueDefaultDebitAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.Production
    ? CHART_OF_ACCOUNTS.DIRECT_MATERIAL_COST
    : CHART_OF_ACCOUNTS.COGS
}

// Định khoản TK Có (kho) mặc định theo lý do xuất (đồng bộ goods-issue.service.ts):
//   sản xuất → 152 (NVL); bán hàng/khác → 156 (hàng hóa).
export function issueDefaultCreditAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.Production
    ? CHART_OF_ACCOUNTS.MATERIAL
    : CHART_OF_ACCOUNTS.GOODS
}

// ── Báo cáo kho ──────────────────────────────────────────────────────────────

// Danh mục báo cáo kho (tab "Báo cáo", theo MISA).
// TODO: Tồn kho theo kho, báo cáo sản xuất/đối chiếu (chờ module lệnh sản xuất, sổ cái).
export type InventoryReportSlug = 'stock-summary' | 'item-ledger'

export const INVENTORY_REPORTS: { slug: InventoryReportSlug; name: string }[] = [
  { slug: 'stock-summary', name: 'Tổng hợp tồn kho' },
  { slug: 'item-ledger', name: 'Sổ chi tiết vật tư hàng hóa' },
]
