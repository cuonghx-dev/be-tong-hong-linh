import { CHART_OF_ACCOUNTS, GoodsIssueCategory, InventoryReceiptType } from '@app/shared'

// Nhãn hiển thị loại chứng từ Phiếu nhập kho (đối chiếu dropdown "Loại chứng từ" MISA).
export const RECEIPT_TYPE_LABEL: Record<InventoryReceiptType, string> = {
  [InventoryReceiptType.Purchase]: 'Mua hàng trong nước nhập kho chưa thanh toán',
  [InventoryReceiptType.FinishedGoods]: 'Nhập kho thành phẩm sản xuất',
}

// Nhãn ngắn cho dropdown chọn khi tạo mới (kèm số thứ tự như form MISA).
export const RECEIPT_TYPE_OPTIONS: { type: InventoryReceiptType; label: string }[] = [
  { type: InventoryReceiptType.Purchase, label: '1. Mua hàng trong nước nhập kho chưa thanh toán' },
  { type: InventoryReceiptType.FinishedGoods, label: '2. Nhập kho thành phẩm sản xuất' },
]

// Định khoản TK Nợ (kho) mặc định theo loại phiếu (đồng bộ receipt.service.ts):
//   mua hàng → 156; thành phẩm SX → 155.
export function defaultDebitAccount(type: InventoryReceiptType): string {
  return type === InventoryReceiptType.FinishedGoods
    ? CHART_OF_ACCOUNTS.FINISHED_GOODS
    : CHART_OF_ACCOUNTS.GOODS
}

// Định khoản TK Có (đối ứng) mặc định theo loại phiếu (đồng bộ receipt.service.ts):
//   mua hàng → 331; thành phẩm SX → 154.
export function defaultCreditAccount(type: InventoryReceiptType): string {
  return type === InventoryReceiptType.FinishedGoods
    ? CHART_OF_ACCOUNTS.WIP
    : CHART_OF_ACCOUNTS.PAYABLE
}

// ── Xuất kho ─────────────────────────────────────────────────────────────────

// Nhãn hiển thị lý do xuất kho (đối chiếu dropdown "Lý do xuất" MISA).
export const GOODS_ISSUE_CATEGORY_LABEL: Record<GoodsIssueCategory, string> = {
  [GoodsIssueCategory.Sales]: 'Xuất kho bán hàng',
  [GoodsIssueCategory.Production]: 'Xuất kho cho sản xuất',
}

// Nhãn ngắn cho dropdown chọn khi tạo mới (kèm số thứ tự như form MISA).
export const GOODS_ISSUE_CATEGORY_OPTIONS: { category: GoodsIssueCategory; label: string }[] = [
  { category: GoodsIssueCategory.Sales, label: '1. Bán hàng' },
  { category: GoodsIssueCategory.Production, label: '2. Sản xuất' },
]

// Định khoản TK Nợ mặc định theo lý do xuất (đồng bộ goods-issue.service.ts):
//   bán hàng → 632 (giá vốn); sản xuất → 621 (CP NVL trực tiếp).
export function issueDefaultDebitAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.Production
    ? CHART_OF_ACCOUNTS.DIRECT_MATERIAL_COST
    : CHART_OF_ACCOUNTS.COGS
}

// Định khoản TK Có (kho) mặc định theo lý do xuất (đồng bộ goods-issue.service.ts):
//   sản xuất → 152 (NVL); bán hàng → 156 (hàng hóa).
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
