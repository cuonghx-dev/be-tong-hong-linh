import { BankPaymentMethod, BankVoucherCategory, BankVoucherType, PartnerType } from '@app/shared'

// Nhãn hiển thị loại nghiệp vụ (§5).
export const CATEGORY_LABEL: Record<BankVoucherCategory, string> = {
  [BankVoucherCategory.Receipt]: 'Thu tiền gửi',
  [BankVoucherCategory.Payment]: 'Ủy nhiệm chi',
  [BankVoucherCategory.SalesBank]: 'Bán hàng - chuyển khoản',
  [BankVoucherCategory.PurchaseServiceBank]: 'Mua dịch vụ - chuyển khoản',
  [BankVoucherCategory.PurchaseGoodsBank]: 'Mua hàng - chuyển khoản',
}

// Nhãn loại chứng từ hiển thị ở lưới (§5).
export const VOUCHER_TYPE_LABEL: Record<BankVoucherType, string> = {
  [BankVoucherType.Receipt]: 'Thu tiền gửi',
  [BankVoucherType.Payment]: 'Ủy nhiệm chi',
}

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  [PartnerType.Customer]: 'Khách hàng',
  [PartnerType.Supplier]: 'Nhà cung cấp',
  [PartnerType.Employee]: 'Nhân viên',
}

// Nhãn phương thức thanh toán (§4 - chỉ chi).
export const PAYMENT_METHOD_LABEL: Record<BankPaymentMethod, string> = {
  [BankPaymentMethod.UNC]: 'Ủy nhiệm chi',
  [BankPaymentMethod.Transfer]: 'Chuyển khoản',
  [BankPaymentMethod.Check]: 'Séc',
}

// Loại nghiệp vụ chọn được theo loại chứng từ (dropdown đầu form).
export const CATEGORY_OPTIONS: Record<BankVoucherType, BankVoucherCategory[]> = {
  [BankVoucherType.Receipt]: [BankVoucherCategory.Receipt, BankVoucherCategory.SalesBank],
  [BankVoucherType.Payment]: [
    BankVoucherCategory.Payment,
    BankVoucherCategory.PurchaseServiceBank,
    BankVoucherCategory.PurchaseGoodsBank,
  ],
}
