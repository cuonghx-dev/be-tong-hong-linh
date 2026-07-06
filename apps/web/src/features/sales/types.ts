import {
  CustomerType,
  InvoiceIssueStatus,
  PaymentMethod,
  SalesPaymentMode,
  SalesVoucherType,
} from '@app/shared'

// Nhãn loại nghiệp vụ chứng từ bán hàng (§3).
export const VOUCHER_TYPE_LABEL: Record<SalesVoucherType, string> = {
  [SalesVoucherType.DomesticGoods]: 'Bán hàng hóa trong nước',
  [SalesVoucherType.DomesticService]: 'Bán dịch vụ trong nước',
}

// Nhãn tùy chọn thanh toán (§3).
export const PAYMENT_MODE_LABEL: Record<SalesPaymentMode, string> = {
  [SalesPaymentMode.Unpaid]: 'Chưa thu tiền',
  [SalesPaymentMode.PaidNow]: 'Thu tiền ngay',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Tiền mặt',
  [PaymentMethod.BankTransfer]: 'Chuyển khoản',
}

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  [CustomerType.Organization]: 'Tổ chức',
  [CustomerType.Individual]: 'Cá nhân',
}

// Nhãn trạng thái phát hành hóa đơn (§5).
export const ISSUE_STATUS_LABEL: Record<InvoiceIssueStatus, string> = {
  [InvoiceIssueStatus.Unissued]: 'Chưa phát hành',
  [InvoiceIssueStatus.CodeIssued]: 'Đã cấp mã',
}
