import { BankPaymentMethod, BankVoucherCategory, BankVoucherType, PartnerType } from '@app/shared'

// Nhãn hiển thị loại nghiệp vụ (§5).
export const CATEGORY_LABEL: Record<BankVoucherCategory, string> = {
  [BankVoucherCategory.Receipt]: 'Thu khác',
  [BankVoucherCategory.InternalTransfer]: 'Chuyển tiền nội bộ',
  [BankVoucherCategory.Payment]: 'Chi khác',
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

// Loại nghiệp vụ chọn được theo loại chứng từ (dropdown đầu form + bộ lọc).
export const CATEGORY_OPTIONS: Record<BankVoucherType, BankVoucherCategory[]> = {
  [BankVoucherType.Receipt]: [
    BankVoucherCategory.Receipt,
    BankVoucherCategory.InternalTransfer,
  ],
  [BankVoucherType.Payment]: [
    BankVoucherCategory.Payment,
    BankVoucherCategory.InternalTransfer,
  ],
}

// Danh mục báo cáo tiền gửi (tab "Báo cáo", theo MISA).
// TODO: Sổ chi tiết chuyển tiền nội bộ (chờ chứng từ chuyển tiền nội bộ),
// S03a1/S03a2-DNN bản tiền gửi, báo cáo khế ước vay/cho vay (chờ module vay).
export type BankReportSlug = 'bank-book' | 'account-balances' | 'daily-balance'

export const BANK_REPORTS: { slug: BankReportSlug; name: string }[] = [
  { slug: 'bank-book', name: 'Sổ tiền gửi ngân hàng' },
  { slug: 'account-balances', name: 'Bảng kê số dư ngân hàng' },
  { slug: 'daily-balance', name: 'Bảng kê số dư tiền theo ngày' },
]
