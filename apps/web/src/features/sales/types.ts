import {
  CustomerType,
  PaymentMethod,
  ReceivableAging,
  ReceivableStatus,
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

// Nhãn phân tích tuổi nợ công nợ phải thu (§6).
export const RECEIVABLE_AGING_LABEL: Record<ReceivableAging, string> = {
  [ReceivableAging.All]: 'Tất cả',
  [ReceivableAging.Current]: 'Trong hạn',
  [ReceivableAging.Days1_30]: 'Quá hạn 1–30 ngày',
  [ReceivableAging.Days31_60]: 'Quá hạn 31–60 ngày',
  [ReceivableAging.Days61_90]: 'Quá hạn 61–90 ngày',
  [ReceivableAging.Over90]: 'Quá hạn trên 90 ngày',
}

// Nhãn tình trạng nợ công nợ phải thu (§6).
export const RECEIVABLE_STATUS_LABEL: Record<ReceivableStatus, string> = {
  [ReceivableStatus.All]: 'Tất cả',
  [ReceivableStatus.Outstanding]: 'Còn nợ',
  [ReceivableStatus.Settled]: 'Đã thu hết',
  [ReceivableStatus.Prepaid]: 'Trả trước',
}
