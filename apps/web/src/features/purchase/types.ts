import {
  PaymentMethod,
  PurchaseOrigin,
  PurchasePaymentMode,
  PurchasePaymentStatus,
  PurchaseReceiveStatus,
  PurchaseVoucherType,
  ReceivableAging,
  ReceivableStatus,
  SupplierType,
} from '@app/shared'

// Nhãn hiển thị loại chứng từ mua hàng (§5).
export const VOUCHER_TYPE_LABEL: Record<PurchaseVoucherType, string> = {
  [PurchaseVoucherType.Stock]: 'Mua hàng trong nước nhập kho',
  [PurchaseVoucherType.NonStock]: 'Mua hàng trong nước không qua kho',
  [PurchaseVoucherType.Service]: 'Mua dịch vụ',
}

// Nhãn nguồn gốc mua hàng (§5).
export const PURCHASE_ORIGIN_LABEL: Record<PurchaseOrigin, string> = {
  [PurchaseOrigin.Domestic]: 'trong nước',
  [PurchaseOrigin.Import]: 'nhập khẩu',
}

// "Lý do" nhập chứng từ mua hàng hóa = nguồn gốc × loại kho (§5).
// Không gồm Mua dịch vụ (chứng từ riêng).
export interface PurchaseReasonOption {
  origin: PurchaseOrigin
  type: PurchaseVoucherType
  label: string
}

export const PURCHASE_REASON_OPTIONS: PurchaseReasonOption[] = [
  { origin: PurchaseOrigin.Domestic, type: PurchaseVoucherType.Stock, label: 'Mua hàng trong nước nhập kho' },
  { origin: PurchaseOrigin.Domestic, type: PurchaseVoucherType.NonStock, label: 'Mua hàng trong nước không qua kho' },
  { origin: PurchaseOrigin.Import, type: PurchaseVoucherType.Stock, label: 'Mua hàng nhập khẩu nhập kho' },
  { origin: PurchaseOrigin.Import, type: PurchaseVoucherType.NonStock, label: 'Mua hàng nhập khẩu không qua kho' },
]

// Mã hóa lựa chọn "Lý do" thành value cho <select> ("DOMESTIC:STOCK").
export const reasonKey = (origin: PurchaseOrigin, type: PurchaseVoucherType) => `${origin}:${type}`

export function parseReasonKey(key: string): { origin: PurchaseOrigin; type: PurchaseVoucherType } {
  const [origin, type] = key.split(':') as [PurchaseOrigin, PurchaseVoucherType]
  return { origin, type }
}

// Nhãn "Lý do" đầy đủ theo nguồn gốc + loại (dùng cho tiêu đề trang, dòng bảng).
export function purchaseReasonLabel(origin: PurchaseOrigin, type: PurchaseVoucherType): string {
  if (type === PurchaseVoucherType.Service) return VOUCHER_TYPE_LABEL[type]
  return (
    PURCHASE_REASON_OPTIONS.find((o) => o.origin === origin && o.type === type)?.label ??
    VOUCHER_TYPE_LABEL[type]
  )
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

// Nhãn tuổi nợ tab Đối chiếu công nợ (dùng chung enum với công nợ phải thu).
export const PAYABLE_AGING_LABEL: Record<ReceivableAging, string> = {
  [ReceivableAging.All]: 'Tất cả',
  [ReceivableAging.Current]: 'Trong hạn',
  [ReceivableAging.Days1_30]: 'Quá hạn 1–30 ngày',
  [ReceivableAging.Days31_60]: 'Quá hạn 31–60 ngày',
  [ReceivableAging.Days61_90]: 'Quá hạn 61–90 ngày',
  [ReceivableAging.Over90]: 'Quá hạn trên 90 ngày',
}

// Nhãn tình trạng nợ phải trả (chiều NCC: Settled = đã trả hết).
export const PAYABLE_STATUS_LABEL: Record<ReceivableStatus, string> = {
  [ReceivableStatus.All]: 'Tất cả',
  [ReceivableStatus.Outstanding]: 'Còn nợ',
  [ReceivableStatus.Settled]: 'Đã trả hết',
  [ReceivableStatus.Prepaid]: 'Trả trước',
}

// Danh mục báo cáo mua hàng (tab "Báo cáo", theo MISA).
export type PurchaseReportSlug = 'detail' | 'by-item' | 'payable-summary' | 'payable-detail'

export const PURCHASE_REPORTS: { slug: PurchaseReportSlug; name: string }[] = [
  { slug: 'detail', name: 'Sổ chi tiết mua hàng' },
  { slug: 'by-item', name: 'Tổng hợp mua hàng theo mặt hàng' },
  { slug: 'payable-summary', name: 'Tổng hợp công nợ phải trả nhà cung cấp' },
  { slug: 'payable-detail', name: 'Chi tiết công nợ phải trả nhà cung cấp' },
]
