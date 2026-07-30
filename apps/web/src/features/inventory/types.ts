import { CHART_OF_ACCOUNTS, GoodsIssueCategory, InventoryReceiptType } from '@app/shared'

// Nhãn hiển thị loại chứng từ Phiếu nhập kho (đối chiếu dropdown "Loại chứng từ" MISA).
export const RECEIPT_TYPE_LABEL: Record<InventoryReceiptType, string> = {
  [InventoryReceiptType.Purchase]: 'Mua hàng trong nước nhập kho chưa thanh toán',
  [InventoryReceiptType.FinishedGoods]: 'Nhập kho thành phẩm sản xuất',
}

// Nhãn cho dropdown "Loại chứng từ".
export const RECEIPT_TYPE_OPTIONS: { type: InventoryReceiptType; label: string }[] = [
  { type: InventoryReceiptType.Purchase, label: RECEIPT_TYPE_LABEL[InventoryReceiptType.Purchase] },
  {
    type: InventoryReceiptType.FinishedGoods,
    label: RECEIPT_TYPE_LABEL[InventoryReceiptType.FinishedGoods],
  },
]

// Loại phiếu nhập kho lập tay được. Loại "mua hàng trong nước" KHÔNG nằm ở đây:
// phiếu đó do chứng từ mua hàng tự sinh (purchase.service), không nhập tay.
export const MANUAL_RECEIPT_TYPES: InventoryReceiptType[] = [InventoryReceiptType.FinishedGoods]

// Loại mặc định khi tạo phiếu nhập kho mới.
export const DEFAULT_RECEIPT_TYPE = InventoryReceiptType.FinishedGoods

// Biến thể form phiếu nhập kho theo loại chứng từ (đối chiếu MISA):
//   Mua hàng      — cụm đối tượng (mã/tên đối tượng) + ô Người giao hàng riêng, có chi nhánh,
//                   dòng hàng có cột Số lô + Hạn sử dụng.
//   Thành phẩm SX — cụm chính là người giao hàng (không có ô riêng), không chi nhánh,
//                   dòng hàng gọn. Địa chỉ có ở cả hai loại.
export interface ReceiptVariant {
  // Placeholder ô tra cứu chứng từ nguồn ở page header.
  sourcePlaceholder: string
  partnerLabel: string
  partnerNameLabel: string
  showDeliverer: boolean
  showBranch: boolean
  // Cột riêng của dòng hàng.
  showLot: boolean
}

export const RECEIPT_VARIANT: Record<InventoryReceiptType, ReceiptVariant> = {
  [InventoryReceiptType.Purchase]: {
    sourcePlaceholder: 'Nhập số phiếu xuất từ chi nhánh khác chuyển đến',
    partnerLabel: 'Mã đối tượng',
    partnerNameLabel: 'Tên đối tượng',
    showDeliverer: true,
    showBranch: true,
    showLot: true,
  },
  [InventoryReceiptType.FinishedGoods]: {
    sourcePlaceholder: 'Nhập lệnh sản xuất',
    partnerLabel: 'Mã người giao hàng',
    partnerNameLabel: 'Tên người giao hàng',
    showDeliverer: false,
    showBranch: false,
    showLot: false,
  },
}

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

// Nhãn cho dropdown "Lý do xuất".
export const GOODS_ISSUE_CATEGORY_OPTIONS: { category: GoodsIssueCategory; label: string }[] = [
  {
    category: GoodsIssueCategory.Sales,
    label: GOODS_ISSUE_CATEGORY_LABEL[GoodsIssueCategory.Sales],
  },
  {
    category: GoodsIssueCategory.Production,
    label: GOODS_ISSUE_CATEGORY_LABEL[GoodsIssueCategory.Production],
  },
]

// Định khoản TK Nợ mặc định theo lý do xuất (đồng bộ goods-issue.service.ts):
//   bán hàng → 632 (giá vốn); sản xuất → 154 (CP SXKD dở dang, như MISA TT133).
export function issueDefaultDebitAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.Production ? CHART_OF_ACCOUNTS.WIP : CHART_OF_ACCOUNTS.COGS
}

// Định khoản TK Có (kho) mặc định theo lý do xuất (đồng bộ goods-issue.service.ts):
//   sản xuất → 152 (NVL); bán hàng → 156 (hàng hóa).
export function issueDefaultCreditAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.Production
    ? CHART_OF_ACCOUNTS.MATERIAL
    : CHART_OF_ACCOUNTS.GOODS
}

// Biến thể form phiếu xuất kho theo lý do xuất (đối chiếu MISA):
//   Bán hàng  — cụm khách hàng (mã/tên KH, người nhận, địa chỉ, NVBH), địa điểm
//               giao hàng dưới bảng, dòng hàng có cột Số lô + Hạn sử dụng.
//   Sản xuất  — cụm người nhận (mã/tên người nhận, bộ phận), KHÔNG có địa chỉ /
//               NVBH / địa điểm giao hàng, dòng hàng có cột Thành phẩm.
export interface GoodsIssueVariant {
  // Placeholder ô tra cứu chứng từ nguồn ở page header.
  sourcePlaceholder: string
  // Cụm đối tượng: khách hàng (bán hàng) hay người nhận nội bộ (sản xuất).
  partner: 'customer' | 'receiver'
  showAddress: boolean
  showSalesEmployee: boolean
  showDepartment: boolean
  showDeliveryLocation: boolean
  // Cột riêng của dòng hàng.
  showLot: boolean
  showFinishedProduct: boolean
}

export const GOODS_ISSUE_VARIANT: Record<GoodsIssueCategory, GoodsIssueVariant> = {
  [GoodsIssueCategory.Sales]: {
    sourcePlaceholder: 'Nhập số chứng từ bán hàng',
    partner: 'customer',
    showAddress: true,
    showSalesEmployee: true,
    showDepartment: false,
    showDeliveryLocation: true,
    showLot: true,
    showFinishedProduct: false,
  },
  [GoodsIssueCategory.Production]: {
    sourcePlaceholder: 'Nhập lệnh sản xuất',
    partner: 'receiver',
    showAddress: false,
    showSalesEmployee: false,
    showDepartment: true,
    showDeliveryLocation: false,
    showLot: false,
    showFinishedProduct: true,
  },
}

// ── Báo cáo kho ──────────────────────────────────────────────────────────────

// Danh mục báo cáo kho (tab "Báo cáo", theo MISA).
// TODO: Tồn kho theo kho, báo cáo sản xuất/đối chiếu (chờ module lệnh sản xuất, sổ cái).
export type InventoryReportSlug = 'stock-summary' | 'item-ledger'

export const INVENTORY_REPORTS: { slug: InventoryReportSlug; name: string }[] = [
  { slug: 'stock-summary', name: 'Tổng hợp tồn kho' },
  { slug: 'item-ledger', name: 'Sổ chi tiết vật tư hàng hóa' },
]
