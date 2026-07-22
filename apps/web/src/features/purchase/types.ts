import {
  PurchaseOrigin,
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

// Nhãn nguồn gốc mua hàng (§5) — chỉ còn trong nước.
export const PURCHASE_ORIGIN_LABEL: Record<PurchaseOrigin, string> = {
  [PurchaseOrigin.Domestic]: 'trong nước',
}

// "Lý do" (loại chứng từ) mua hàng — đúng 4 loại theo MISA, mã hóa cả tùy chọn
// thanh toán: loại "- Tiền mặt" là trả ngay TM (tự sinh phiếu chi, số PC).
export interface PurchaseReasonOption {
  origin: PurchaseOrigin
  type: PurchaseVoucherType
  paymentMode: PurchasePaymentMode
  label: string
}

export const PURCHASE_REASON_OPTIONS: PurchaseReasonOption[] = [
  {
    origin: PurchaseOrigin.Domestic,
    type: PurchaseVoucherType.Stock,
    paymentMode: PurchasePaymentMode.Unpaid,
    label: 'Mua hàng trong nước nhập kho chưa thanh toán',
  },
  {
    origin: PurchaseOrigin.Domestic,
    type: PurchaseVoucherType.NonStock,
    paymentMode: PurchasePaymentMode.Unpaid,
    label: 'Mua hàng trong nước không qua kho chưa thanh toán',
  },
  {
    origin: PurchaseOrigin.Domestic,
    type: PurchaseVoucherType.NonStock,
    paymentMode: PurchasePaymentMode.Immediate,
    label: 'Mua hàng trong nước không qua kho - Tiền mặt',
  },
  {
    origin: PurchaseOrigin.Domestic,
    type: PurchaseVoucherType.Service,
    paymentMode: PurchasePaymentMode.Unpaid,
    label: 'Chứng từ mua dịch vụ chưa thanh toán',
  },
]

// Tổ hợp xác định 1 loại chứng từ (dòng bảng cũng có đủ các field này).
export interface PurchaseReasonCombo {
  origin: PurchaseOrigin
  type: PurchaseVoucherType
  paymentMode: PurchasePaymentMode
}

// Mã hóa lựa chọn "Lý do" thành value cho <select> ("DOMESTIC:STOCK:UNPAID").
export const reasonKey = (c: PurchaseReasonCombo) => `${c.origin}:${c.type}:${c.paymentMode}`

export function parseReasonKey(key: string): PurchaseReasonCombo {
  const [origin, type, paymentMode] = key.split(':') as [
    PurchaseOrigin,
    PurchaseVoucherType,
    PurchasePaymentMode,
  ]
  return { origin, type, paymentMode }
}

// Nhãn loại chứng từ đầy đủ (dòng bảng). Tổ hợp ngoài 4 loại chuẩn (nếu còn
// trong dữ liệu cũ) dựng nhãn theo công thức MISA thay vì rơi về nhãn cụt.
export function purchaseReasonLabel(c: PurchaseReasonCombo): string {
  const exact = PURCHASE_REASON_OPTIONS.find(
    (o) => o.origin === c.origin && o.type === c.type && o.paymentMode === c.paymentMode,
  )
  if (exact) return exact.label
  const base =
    c.type === PurchaseVoucherType.Service
      ? 'Chứng từ mua dịch vụ'
      : `Mua hàng ${PURCHASE_ORIGIN_LABEL[c.origin]} ${c.type === PurchaseVoucherType.Stock ? 'nhập kho' : 'không qua kho'}`
  return base + (c.paymentMode === PurchasePaymentMode.Immediate ? ' - Tiền mặt' : ' chưa thanh toán')
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

// Danh mục báo cáo mua hàng (tab "Báo cáo", theo MISA).
export type PurchaseReportSlug = 'detail' | 'by-item' | 'payable-summary' | 'payable-detail'

export const PURCHASE_REPORTS: { slug: PurchaseReportSlug; name: string }[] = [
  { slug: 'detail', name: 'Sổ chi tiết mua hàng' },
  { slug: 'by-item', name: 'Tổng hợp mua hàng theo mặt hàng' },
  { slug: 'payable-summary', name: 'Tổng hợp công nợ phải trả nhà cung cấp' },
  { slug: 'payable-detail', name: 'Chi tiết công nợ phải trả nhà cung cấp' },
]
