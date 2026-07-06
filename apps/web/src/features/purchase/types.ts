import {
  PaymentMethod,
  PurchasePaymentMode,
  PurchasePaymentStatus,
  PurchaseReceiveStatus,
  PurchaseVoucherType,
  SupplierType,
} from '@app/shared'

// Nhãn hiển thị loại chứng từ mua hàng (§5).
export const VOUCHER_TYPE_LABEL: Record<PurchaseVoucherType, string> = {
  [PurchaseVoucherType.Stock]: 'Mua hàng trong nước nhập kho',
  [PurchaseVoucherType.NonStock]: 'Mua hàng trong nước không qua kho',
  [PurchaseVoucherType.Service]: 'Mua dịch vụ',
}

// Prefix số chứng từ theo loại (§10.1).
export const VOUCHER_TYPE_PREFIX: Record<PurchaseVoucherType, string> = {
  [PurchaseVoucherType.Stock]: 'NK',
  [PurchaseVoucherType.NonStock]: 'MH',
  [PurchaseVoucherType.Service]: 'MDV',
}

export const PAYMENT_MODE_LABEL: Record<PurchasePaymentMode, string> = {
  [PurchasePaymentMode.Unpaid]: 'Chưa thanh toán',
  [PurchasePaymentMode.Immediate]: 'Thanh toán ngay',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Tiền mặt',
  [PaymentMethod.BankTransfer]: 'Chuyển khoản',
}

export const RECEIVE_STATUS_LABEL: Record<PurchaseReceiveStatus, string> = {
  [PurchaseReceiveStatus.NotReceived]: 'Chưa nhận HĐ',
  [PurchaseReceiveStatus.Received]: 'Đã nhận HĐ',
}

export const PAYMENT_STATUS_LABEL: Record<PurchasePaymentStatus, string> = {
  [PurchasePaymentStatus.Unpaid]: 'Chưa thanh toán',
  [PurchasePaymentStatus.Partial]: 'Thanh toán một phần',
  [PurchasePaymentStatus.Paid]: 'Đã thanh toán',
}

export const SUPPLIER_TYPE_LABEL: Record<SupplierType, string> = {
  [SupplierType.Organization]: 'Tổ chức',
  [SupplierType.Individual]: 'Cá nhân',
}

// Loại nhập kho có cột Kho + TK Kho (§4).
export function hasWarehouse(type: PurchaseVoucherType): boolean {
  return type === PurchaseVoucherType.Stock
}
