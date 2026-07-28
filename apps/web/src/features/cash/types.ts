import { CashVoucherCategory, CashVoucherType, PartnerType } from '@app/shared'

// Nhãn hiển thị loại chứng từ (§5).
export const CATEGORY_LABEL: Record<CashVoucherCategory, string> = {
  [CashVoucherCategory.SalesCash]: 'Bán hàng hóa trong nước - Tiền mặt',
  [CashVoucherCategory.Receipt]: 'Thu khác',
  [CashVoucherCategory.PaymentEmployeeAdvance]: 'Tạm ứng cho nhân viên',
  [CashVoucherCategory.PaymentPurchaseWithInvoice]: 'Chi mua ngoài có hóa đơn',
  [CashVoucherCategory.DepositToBank]: 'Gửi tiền vào ngân hàng',
  [CashVoucherCategory.Payment]: 'Chi khác',
  [CashVoucherCategory.PurchaseServiceCash]: 'Chứng từ mua dịch vụ - Tiền mặt',
  [CashVoucherCategory.PurchaseGoodsCash]: 'Mua hàng trong nước không qua kho - Tiền mặt',
}

// Lý do nộp/chi mặc định theo loại nghiệp vụ (MISA tự điền khi đổi loại/chọn đối tượng).
// Template kết thúc bằng khoảng trắng → nối thêm tên đối tượng nếu có.
const CATEGORY_REASON: Record<CashVoucherCategory, string> = {
  [CashVoucherCategory.SalesCash]: 'Thu tiền bán hàng ',
  [CashVoucherCategory.Receipt]: 'Thu tiền của ',
  [CashVoucherCategory.PaymentEmployeeAdvance]: 'Tạm ứng cho ',
  [CashVoucherCategory.PaymentPurchaseWithInvoice]: 'Chi tiền mua hàng của ',
  [CashVoucherCategory.DepositToBank]: 'Gửi tiền vào ngân hàng',
  [CashVoucherCategory.Payment]: 'Chi tiền cho ',
  [CashVoucherCategory.PurchaseServiceCash]: 'Chi tiền mua dịch vụ của ',
  [CashVoucherCategory.PurchaseGoodsCash]: 'Chi tiền mua hàng của ',
}

export function defaultReason(category: CashVoucherCategory, partnerName?: string | null): string {
  const tpl = CATEGORY_REASON[category]
  return tpl.endsWith(' ') && partnerName ? tpl + partnerName : tpl
}

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  [PartnerType.Customer]: 'Khách hàng',
  [PartnerType.Supplier]: 'Nhà cung cấp',
  [PartnerType.Employee]: 'Nhân viên',
}

// Loại nghiệp vụ chọn được theo loại phiếu (dropdown đầu form) — thứ tự theo MISA §5.
export const CATEGORY_OPTIONS: Record<CashVoucherType, CashVoucherCategory[]> = {
  // Phiếu thu chỉ tạo tay được "Thu khác" — bán hàng tiền mặt tự sinh từ phân hệ Bán hàng.
  [CashVoucherType.Receipt]: [CashVoucherCategory.Receipt],
  [CashVoucherType.Payment]: [
    CashVoucherCategory.PaymentEmployeeAdvance,
    CashVoucherCategory.PaymentPurchaseWithInvoice,
    CashVoucherCategory.DepositToBank,
    CashVoucherCategory.Payment,
  ],
}

// Lý do lọc theo loại phiếu — khác CATEGORY_OPTIONS (chỉ loại nhập tay) ở chỗ
// gồm cả loại tự sinh (bán hàng/mua hàng tiền mặt) để lọc được phiếu tự sinh.
export const FILTER_CATEGORY_OPTIONS: Record<CashVoucherType, CashVoucherCategory[]> = {
  [CashVoucherType.Receipt]: [
    ...CATEGORY_OPTIONS[CashVoucherType.Receipt],
    CashVoucherCategory.SalesCash,
  ],
  [CashVoucherType.Payment]: [
    ...CATEGORY_OPTIONS[CashVoucherType.Payment],
    CashVoucherCategory.PurchaseGoodsCash,
    CashVoucherCategory.PurchaseServiceCash,
  ],
}

// Cấu hình cột bảng hạch toán — thay đổi theo loại nghiệp vụ (§4).
export interface LineColumnConfig {
  showCostItem: boolean // Khoản mục CP (PC - Chi khác)
  showBank: boolean // TK ngân hàng + Tên ngân hàng (Gửi tiền vào NH)
  showPartner: boolean // Đối tượng + Tên đối tượng
}

export function lineColumns(category: CashVoucherCategory): LineColumnConfig {
  if (category === CashVoucherCategory.DepositToBank) {
    return { showCostItem: false, showBank: true, showPartner: false }
  }
  if (category === CashVoucherCategory.Payment) {
    return { showCostItem: true, showBank: false, showPartner: true }
  }
  return { showCostItem: false, showBank: false, showPartner: true }
}

// Danh mục báo cáo tiền mặt (tab "Báo cáo", theo MISA).
export type CashReportSlug = 'receipt-journal' | 'payment-journal' | 'cash-book' | 'daily-balance'

export const CASH_REPORTS: { slug: CashReportSlug; name: string }[] = [
  { slug: 'receipt-journal', name: 'S03a1-DNN: Sổ nhật ký thu tiền' },
  { slug: 'payment-journal', name: 'S03a2-DNN: Sổ nhật ký chi tiền' },
  { slug: 'cash-book', name: 'Sổ kế toán chi tiết quỹ tiền mặt' },
  { slug: 'daily-balance', name: 'Bảng kê số dư tiền theo ngày' },
]
