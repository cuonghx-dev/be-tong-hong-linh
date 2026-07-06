// Type request/response phân hệ Bán hàng (04-ban-hang) — dùng chung FE ↔ BE.
import type {
  CustomerType,
  InvoiceIssueStatus,
  PaymentMethod,
  SalesPaymentMode,
  SalesVoucherType,
} from '../enums'

// ── Chứng từ bán hàng ────────────────────────────────────────────────────────

// Dòng hàng tiền của chứng từ bán hàng (§3 - bảng Hàng tiền).
export interface SalesVoucherLineDto {
  id: string
  lineNo: number
  itemId: string | null // Mã hàng
  itemName: string | null // Tên hàng
  tradeDiscount: string // Chiết khấu thương mại (Decimal → string)
  debtAccount: string // TK công nợ 131 (Nợ) — đổi thành TK tiền khi thu ngay
  revenueAccount: string // TK doanh thu 5111/5112 (Có)
  unit: string | null // ĐVT
  quantity: string // Số lượng
  unitPrice: string // Đơn giá
  amount: string // Thành tiền
  vatRate: string // % Thuế GTGT
  vatAmount: string // Tiền thuế GTGT
  vatAccount: string // TK thuế GTGT 33311 (Có)
  lotNo: string | null // Số lô
}

// Chứng từ bán hàng (ghi nhận doanh thu).
export interface SalesVoucherDto {
  id: string
  voucherNo: string // vd BH2167/2026
  voucherType: SalesVoucherType
  paymentMode: SalesPaymentMode // Chưa thu / Thu ngay
  paymentMethod: PaymentMethod | null // Khi thu ngay
  isInventoryIssue: boolean // Kiêm phiếu xuất
  withInvoice: boolean // Lập kèm hóa đơn
  isPosInvoice: boolean // Là hóa đơn từ máy tính tiền
  postingDate: string // Ngày hạch toán (ISO date-only)
  voucherDate: string // Ngày chứng từ
  customerId: string | null
  customerName: string | null
  taxCode: string | null // MST/CCCD
  contactPerson: string | null // Người liên hệ
  address: string | null
  salesEmployeeId: string | null // Nhân viên bán hàng
  description: string | null // Diễn giải
  attachmentCount: number
  paymentTermId: string | null // Điều khoản thanh toán
  creditDays: number | null // Số ngày được nợ
  dueDate: string | null // Hạn thanh toán
  totalGoods: string // Tổng tiền hàng
  totalVat: string // Thuế GTGT
  totalAmount: string // Tổng tiền thanh toán
  einvoiceLookupCode: string | null // Mã tra cứu HĐĐT
  einvoiceLookupUrl: string | null // Đường dẫn tra cứu HĐĐT
  invoiceId: string | null // Hóa đơn liên kết
  invoiceNo: string | null // Số hóa đơn liên kết (tiện hiển thị)
  receiptId: string | null // Phiếu thu (thu ngay)
  branchId: string | null
  lines: SalesVoucherLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hàng tiền.
export interface CreateSalesVoucherLineInput {
  itemId?: string | null
  itemName?: string | null
  tradeDiscount?: number
  debtAccount?: string | null
  revenueAccount?: string | null
  unit?: string | null
  quantity: number
  unitPrice: number
  vatRate?: number
  vatAccount?: string | null
  lotNo?: string | null
}

// Payload tạo chứng từ bán hàng.
export interface CreateSalesVoucherInput {
  voucherType: SalesVoucherType
  paymentMode: SalesPaymentMode
  paymentMethod?: PaymentMethod | null
  isInventoryIssue?: boolean
  withInvoice?: boolean
  isPosInvoice?: boolean
  postingDate: string
  voucherDate: string
  customerId?: string | null
  customerName?: string | null
  taxCode?: string | null
  contactPerson?: string | null
  address?: string | null
  salesEmployeeId?: string | null
  description?: string | null
  attachmentCount?: number
  paymentTermId?: string | null
  creditDays?: number | null
  dueDate?: string | null
  einvoiceLookupCode?: string | null
  einvoiceLookupUrl?: string | null
  branchId?: string | null
  lines: CreateSalesVoucherLineInput[]
}

// Sửa chứng từ — không cho đổi loại nghiệp vụ (voucherType) sau khi tạo.
export type UpdateSalesVoucherInput = Partial<Omit<CreateSalesVoucherInput, 'voucherType'>>

// Tham số lọc danh sách bán hàng.
export interface SalesVoucherFilter {
  page?: number
  pageSize?: number
  voucherType?: SalesVoucherType
  paymentMode?: SalesPaymentMode
  customerId?: string
  fromDate?: string
  toDate?: string
  keyword?: string
}

// ── Hóa đơn điện tử ──────────────────────────────────────────────────────────

export interface InvoiceDto {
  id: string
  invoiceNo: string | null // vd 00004692 (null khi chưa cấp số)
  invoiceType: string | null // Loại hóa đơn (vd "Hóa đơn từ máy tính tiền")
  status: string // Trạng thái HĐ (vd "Hóa đơn mới")
  issueStatus: InvoiceIssueStatus // Chưa phát hành / Đã cấp mã
  templateNo: string | null // Mẫu số HĐ
  symbol: string | null // Ký hiệu HĐ (vd 1C26MYY)
  taxAuthorityCode: string | null // Mã CQT
  taxSubmitStatus: string | null // TT gửi CQT
  sendStatus: string | null // TT gửi hóa đơn
  customerReceived: boolean // KH đã nhận hóa đơn
  lookupCode: string | null // Mã tra cứu HĐĐT
  lookupUrl: string | null // Đường dẫn tra cứu
  paymentForm: string | null // Hình thức thanh toán (vd TM/CK)
  bankAccount: string | null
  invoiceDate: string // Ngày HĐ (ISO date-only)
  posted: boolean // Đã hạch toán
  salesVoucherId: string | null // Chứng từ bán hàng nguồn
  salesVoucherNo: string | null
  customerId: string | null
  customerName: string | null
  totalAmount: string
  branchId: string | null
  createdAt: string
  updatedAt: string
}

// Tham số lọc danh sách hóa đơn.
export interface InvoiceFilter {
  page?: number
  pageSize?: number
  issueStatus?: InvoiceIssueStatus
  customerId?: string
  fromDate?: string
  toDate?: string
  keyword?: string
}

// ── Khách hàng ───────────────────────────────────────────────────────────────

export interface CustomerDto {
  id: string
  code: string // Mã khách hàng (bắt buộc, duy nhất)
  name: string
  type: CustomerType // Tổ chức / Cá nhân
  isSupplier: boolean // Là nhà cung cấp (đối tượng dùng chung)
  isInternal: boolean // Đối tượng nội bộ
  taxCode: string | null // MST/CCCD chủ hộ
  budgetRelationCode: string | null // Mã số ĐVQHNS
  phone: string | null
  website: string | null
  address: string | null
  groupId: string | null // Nhóm khách hàng
  salesEmployeeId: string | null // Nhân viên bán hàng
  contactName: string | null // Người liên hệ
  contactEmail: string | null // Email nhận HĐĐT
  contactPhone: string | null
  receivable: string // Công nợ phải thu (tổng hợp)
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerInput {
  code: string
  name: string
  type?: CustomerType
  isSupplier?: boolean
  isInternal?: boolean
  taxCode?: string | null
  budgetRelationCode?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  groupId?: string | null
  salesEmployeeId?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>

export interface CustomerFilter {
  page?: number
  pageSize?: number
  keyword?: string
  groupId?: string
}

// ── Công nợ phải thu khách hàng (view/tổng hợp) ──────────────────────────────

export interface CustomerReceivableDto {
  customerId: string
  customerCode: string
  customerName: string
  address: string | null
  taxCode: string | null
  groupId: string | null
  receivableByInvoice: string // Số còn phải thu theo HĐ
  prepaidOrDeduction: string // Số thu trước/Giảm trừ khác
  remainingReceivable: string // Số còn phải thu (có thể âm)
}

export interface CustomerReceivableFilter {
  page?: number
  pageSize?: number
  keyword?: string
}
