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

// Dropdown loại nghiệp vụ ở page header — chỉ 2 loại mua hàng (§5). Mua dịch vụ
// là loại chứng từ riêng (vào từ AddMenu), KHÔNG phải 1 lý do của mua hàng.
// Tùy chọn thanh toán cũng KHÔNG nằm trong danh sách này: MISA để radio
// "Chưa thanh toán / Thanh toán ngay" + dropdown phương thức riêng ở sub-header.
export const PURCHASE_TYPE_OPTIONS: PurchaseVoucherType[] = [
  PurchaseVoucherType.Stock,
  PurchaseVoucherType.NonStock,
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

// Cấu hình hiển thị form chứng từ theo loại (khớp 3 màn hình MISA):
// nhập kho / không qua kho / mua dịch vụ khác nhau ở nhãn tab, cột bảng,
// trường header (người giao hàng, kèm theo) và nhãn tổng hợp.
export interface PurchaseFormVariant {
  title: string
  mainTab: string // tab bản ghi đầu (MISA: Phiếu nhập / Chứng từ ghi nợ / Hạch toán)
  lineTab: string // sub-tab bảng dòng (Hàng tiền / Hạch toán)
  voucherNoLabel: string
  itemCodeLabel: string
  itemNameLabel: string
  stockAccountLabel: string // TK Kho / TK Chi phí / TK chi phí/TK kho
  contractPlaceholder: string
  descriptionDefault: string
  delivererLabel: string | null // Nhãn cột deliverer: nhập kho "Người giao hàng", dịch vụ "Người nhận"
  hasAttachment: boolean // Kèm theo (chứng từ gốc) — chỉ nhập kho
  hasCostFlag: boolean // checkbox "Là chi phí mua hàng" — chỉ mua dịch vụ
  hasCostTab: boolean // sub-tab Chi phí (phân bổ CP mua hàng) — không có ở mua dịch vụ
  hasTaxTab: boolean // sub-tab Thuế (MISA mua dịch vụ tách thuế GTGT khỏi tab Hạch toán)
  hasInvoiceTab: boolean // tab bản ghi Hóa đơn — mua dịch vụ không có (HĐ nằm trong sub-tab Thuế)
  totalGoodsLabel: string
  totalValueLabel: string | null // Giá trị nhập kho / Tổng giá trị / (không có)
}

export const FORM_VARIANT: Record<PurchaseVoucherType, PurchaseFormVariant> = {
  [PurchaseVoucherType.Stock]: {
    title: 'Chứng từ mua hàng',
    mainTab: 'Phiếu nhập',
    lineTab: 'Hàng tiền',
    voucherNoLabel: 'Số phiếu nhập',
    itemCodeLabel: 'Mã hàng',
    itemNameLabel: 'Tên hàng',
    stockAccountLabel: 'TK Kho',
    contractPlaceholder: 'Nhập số hợp đồng mua …',
    descriptionDefault: 'Mua hàng',
    delivererLabel: 'Người giao hàng',
    hasAttachment: true,
    hasCostFlag: false,
    hasCostTab: true,
    hasTaxTab: false,
    hasInvoiceTab: true,
    totalGoodsLabel: 'Tổng tiền hàng',
    totalValueLabel: 'Giá trị nhập kho',
  },
  [PurchaseVoucherType.NonStock]: {
    title: 'Chứng từ mua hàng',
    mainTab: 'Chứng từ ghi nợ',
    lineTab: 'Hàng tiền',
    voucherNoLabel: 'Số chứng từ',
    itemCodeLabel: 'Mã hàng',
    itemNameLabel: 'Tên hàng',
    stockAccountLabel: 'TK Chi phí',
    contractPlaceholder: 'Nhập số hợp đồng mua …',
    descriptionDefault: 'Mua hàng',
    delivererLabel: null,
    hasAttachment: false,
    hasCostFlag: false,
    hasCostTab: true,
    hasTaxTab: false,
    hasInvoiceTab: true,
    totalGoodsLabel: 'Tổng tiền hàng',
    totalValueLabel: 'Tổng giá trị',
  },
  [PurchaseVoucherType.Service]: {
    // MISA không có tab bản ghi ở mua dịch vụ (hóa đơn nằm trong sub-tab Thuế);
    // app giữ tab Hóa đơn chung nên tab đầu đặt "Chứng từ", tránh trùng sub-tab Hạch toán.
    title: 'Chứng từ mua dịch vụ',
    mainTab: 'Chứng từ',
    lineTab: 'Hạch toán',
    voucherNoLabel: 'Số chứng từ',
    itemCodeLabel: 'Mã dịch vụ',
    itemNameLabel: 'Tên dịch vụ',
    stockAccountLabel: 'TK chi phí/TK kho',
    contractPlaceholder: 'Lập từ hợp đồng mua …',
    descriptionDefault: 'Mua dịch vụ',
    delivererLabel: 'Người nhận',
    hasAttachment: false,
    hasCostFlag: true,
    hasCostTab: false, // mua dịch vụ LÀ chứng từ chi phí — không tự phân bổ
    hasTaxTab: true,
    hasInvoiceTab: false,
    totalGoodsLabel: 'Tổng tiền dịch vụ',
    totalValueLabel: null,
  },
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
