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

// Dropdown loại nghiệp vụ ở page header — 3 loại (§5). Tùy chọn thanh toán KHÔNG
// nằm trong danh sách này: MISA để radio "Chưa thanh toán / Thanh toán ngay" +
// dropdown phương thức riêng ở sub-header, nên mọi loại đều trả ngay được.
export const PURCHASE_TYPE_OPTIONS: PurchaseVoucherType[] = [
  PurchaseVoucherType.Stock,
  PurchaseVoucherType.NonStock,
  PurchaseVoucherType.Service,
]

// Phương thức thanh toán khi "Thanh toán ngay" — hiện chỉ tiền mặt (backend sinh
// phiếu chi tiền mặt); chuyển khoản/UNC chưa hỗ trợ.
export const PURCHASE_PAYMENT_METHODS = [{ value: 'CASH', label: 'Tiền mặt' }] as const

// Tổ hợp xác định 1 loại chứng từ (dòng bảng cũng có đủ các field này).
export interface PurchaseReasonCombo {
  origin: PurchaseOrigin
  type: PurchaseVoucherType
  paymentMode: PurchasePaymentMode
}

// Nhãn loại chứng từ đầy đủ (dòng bảng) — dựng theo công thức MISA:
// "Mua hàng <nguồn> <nhập kho|không qua kho>" | "Chứng từ mua dịch vụ",
// hậu tố " - Tiền mặt" (trả ngay) hoặc " chưa thanh toán".
export function purchaseReasonLabel(c: PurchaseReasonCombo): string {
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
