import { CashVoucherCategory, CashVoucherType, PartnerType } from '@app/shared'

// Nhãn hiển thị loại chứng từ (§5).
export const CATEGORY_LABEL: Record<CashVoucherCategory, string> = {
  [CashVoucherCategory.SalesCash]: 'Bán hàng hóa trong nước - Tiền mặt',
  [CashVoucherCategory.Receipt]: 'Phiếu thu',
  [CashVoucherCategory.Payment]: 'Phiếu chi',
  [CashVoucherCategory.PurchaseServiceCash]: 'Chứng từ mua dịch vụ - Tiền mặt',
  [CashVoucherCategory.PurchaseGoodsCash]: 'Mua hàng trong nước không qua kho - Tiền mặt',
  [CashVoucherCategory.DepositToBank]: 'Gửi tiền vào ngân hàng',
}

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  [PartnerType.Customer]: 'Khách hàng',
  [PartnerType.Supplier]: 'Nhà cung cấp',
  [PartnerType.Employee]: 'Nhân viên',
}

// Loại nghiệp vụ chọn được theo loại phiếu (dropdown đầu form).
export const CATEGORY_OPTIONS: Record<CashVoucherType, CashVoucherCategory[]> = {
  [CashVoucherType.Receipt]: [CashVoucherCategory.Receipt, CashVoucherCategory.SalesCash],
  [CashVoucherType.Payment]: [
    CashVoucherCategory.Payment,
    CashVoucherCategory.DepositToBank,
    CashVoucherCategory.PurchaseServiceCash,
    CashVoucherCategory.PurchaseGoodsCash,
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
