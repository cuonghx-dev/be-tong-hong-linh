import { CashVoucherCategory, CashVoucherType, PartnerType } from '@app/shared'

// Nhãn hiển thị loại chứng từ (§5).
export const CATEGORY_LABEL: Record<CashVoucherCategory, string> = {
  [CashVoucherCategory.SalesCash]: 'Bán hàng hóa trong nước - Tiền mặt',
  [CashVoucherCategory.ReceiptBankWithdraw]: 'Rút tiền gửi về nhập quỹ',
  [CashVoucherCategory.ReceiptEmployeeAdvance]: 'Thu hoàn ứng nhân viên',
  [CashVoucherCategory.ReceiptCustomer]: 'Thu tiền khách hàng (không theo hóa đơn)',
  [CashVoucherCategory.Receipt]: 'Thu khác',
  [CashVoucherCategory.ReceiptLoanRecovery]: 'Thu hồi các khoản cho vay',
  [CashVoucherCategory.PaymentEmployeeAdvance]: 'Tạm ứng cho nhân viên',
  [CashVoucherCategory.Payment]: 'Chi khác',
  [CashVoucherCategory.DepositToBank]: 'Gửi tiền vào ngân hàng',
  [CashVoucherCategory.PaymentSupplier]: 'Trả tiền nhà cung cấp (không theo hóa đơn)',
  [CashVoucherCategory.PaymentPurchaseWithInvoice]: 'Chi mua ngoài có hóa đơn',
  [CashVoucherCategory.PaymentSalaryAdvance]: 'Trả lương tạm ứng cho nhân viên',
  [CashVoucherCategory.PaymentSalary]: 'Trả lương nhân viên',
  [CashVoucherCategory.PaymentToBranch]: 'Chuyển tiền cho chi nhánh khác',
  [CashVoucherCategory.PaymentLoan]: 'Chi cho vay',
  [CashVoucherCategory.PaymentCITTax]: 'Nộp thuế TNDN tạm tính',
  [CashVoucherCategory.PurchaseServiceCash]: 'Chứng từ mua dịch vụ - Tiền mặt',
  [CashVoucherCategory.PurchaseGoodsCash]: 'Mua hàng trong nước không qua kho - Tiền mặt',
}

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  [PartnerType.Customer]: 'Khách hàng',
  [PartnerType.Supplier]: 'Nhà cung cấp',
  [PartnerType.Employee]: 'Nhân viên',
}

// Loại nghiệp vụ chọn được theo loại phiếu (dropdown đầu form) — thứ tự theo MISA §5.
export const CATEGORY_OPTIONS: Record<CashVoucherType, CashVoucherCategory[]> = {
  [CashVoucherType.Receipt]: [
    CashVoucherCategory.ReceiptBankWithdraw,
    CashVoucherCategory.ReceiptEmployeeAdvance,
    CashVoucherCategory.ReceiptCustomer,
    CashVoucherCategory.Receipt,
    CashVoucherCategory.ReceiptLoanRecovery,
  ],
  [CashVoucherType.Payment]: [
    CashVoucherCategory.PaymentEmployeeAdvance,
    CashVoucherCategory.Payment,
    CashVoucherCategory.DepositToBank,
    CashVoucherCategory.PaymentSupplier,
    CashVoucherCategory.PaymentPurchaseWithInvoice,
    CashVoucherCategory.PaymentSalaryAdvance,
    CashVoucherCategory.PaymentSalary,
    CashVoucherCategory.PaymentToBranch,
    CashVoucherCategory.PaymentLoan,
    CashVoucherCategory.PaymentCITTax,
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
