// Type request/response phân hệ Bán hàng (04-ban-hang) — dùng chung FE ↔ BE.
import type {
  CustomerType,
  InvoicePaymentForm,
  PaymentMethod,
  ReceivableAging,
  ReceivableStatus,
  SalesPaymentMode,
  SalesPaymentStatus,
  SalesVoucherType,
} from '../enums'
// LƯU Ý: chứng từ bán hàng chỉ còn 2 loại — "Bán hàng hóa trong nước - Tiền mặt"
// (PAID_NOW, PT tự sinh) và "Bán hàng hóa trong nước chưa thu tiền" (UNPAID).

// ── Chứng từ bán hàng ────────────────────────────────────────────────────────

// Dòng hàng tiền của chứng từ bán hàng (§3 - bảng Hàng tiền).
export interface SalesVoucherLineDto {
  id: string
  lineNo: number
  itemId: string | null // Mã hàng
  itemName: string | null // Tên hàng
  tradeDiscount: string // Chiết khấu thương mại (Decimal → string)
  debtAccount: string // TK công nợ 131 (Nợ) — đổi thành TK tiền mặt khi thu ngay
  revenueAccount: string // TK doanh thu 5111 (Có)
  unit: string | null // ĐVT
  quantity: string // Số lượng
  unitPrice: string // Đơn giá
  amount: string // Thành tiền
  vatRate: string // % Thuế GTGT
  vatAmount: string // Tiền thuế GTGT
  vatAccount: string // TK thuế GTGT 33311 (Có)
  lotNo: string | null // Số lô
  // ── Tab Giá vốn ──
  warehouseId: string | null // Kho xuất
  costAccount: string | null // TK giá vốn (632)
  inventoryAccount: string | null // TK kho (156)
  costPrice: string // Đơn giá vốn (Decimal → string)
}

// Chứng từ bán hàng (ghi nhận doanh thu).
export interface SalesVoucherDto {
  id: string
  voucherNo: string // vd BH2167/2026
  invoiceNo: string | null // Số hóa đơn
  voucherType: SalesVoucherType
  paymentMode: SalesPaymentMode // Chưa thu / Thu tiền mặt ngay
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
  issueReason: string | null // Lý do xuất (tab Phiếu xuất)
  // ── Tab Hóa đơn (§3) ──
  invoiceForm: string | null // Mẫu số HĐ
  invoiceSerial: string | null // Ký hiệu HĐ
  invoiceDate: string | null // Ngày HĐ (ISO date-only)
  buyerName: string | null // Người mua hàng
  invoicePaymentForm: InvoicePaymentForm | null // Hình thức thanh toán trên HĐ
  bankAccountNo: string | null // Tài khoản ngân hàng ghi trên HĐ
  phone: string | null // Điện thoại người mua
  budgetRelationCode: string | null // Mã số ĐVQHNS
  idCardNo: string | null // Số CCCD
  passportNo: string | null // Số hộ chiếu
  receiptId: string | null // Phiếu thu (thu ngay TM)
  receiptNo?: string | null // Số phiếu thu tự sinh (chỉ trả ở API chi tiết)
  issueId: string | null // Phiếu xuất kho (kiêm phiếu xuất)
  issueNo?: string | null // Số phiếu xuất tự sinh (chỉ trả ở API chi tiết)
  posted: boolean // Đã ghi sổ; bỏ ghi = còn nháp, loại khỏi sổ/báo cáo
  branchId: string | null
  paidAmount: string // Đã thu (thu ngay = tổng tiền; chưa thu = tổng đối trừ đã ghi sổ)
  paymentStatus: SalesPaymentStatus // TT thanh toán (tính từ paidAmount)
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
  // Tab Giá vốn — để trống thì backend lấy theo dữ liệu ngầm định của VTHH.
  warehouseId?: string | null
  costAccount?: string | null
  inventoryAccount?: string | null
  costPrice?: number
}

// Payload tạo chứng từ bán hàng.
export interface CreateSalesVoucherInput {
  voucherType: SalesVoucherType
  invoiceNo?: string | null
  paymentMode: SalesPaymentMode
  isInventoryIssue?: boolean
  withInvoice?: boolean
  isPosInvoice?: boolean
  postingDate: string
  voucherDate: string
  customerId?: string | null
  customerName: string // Bắt buộc — chứng từ bán hàng phải có tên KH
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
  issueReason?: string | null // Lý do xuất — trống thì backend tự sinh
  // ── Tab Hóa đơn (§3) ──
  invoiceForm?: string | null
  invoiceSerial?: string | null
  invoiceDate?: string | null
  buyerName?: string | null
  invoicePaymentForm?: InvoicePaymentForm | null
  bankAccountNo?: string | null
  phone?: string | null
  budgetRelationCode?: string | null
  idCardNo?: string | null
  passportNo?: string | null
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

// ── Khách hàng ───────────────────────────────────────────────────────────────

export interface CustomerDto {
  id: string
  code: string // Mã khách hàng (bắt buộc, duy nhất)
  name: string
  type: CustomerType // Tổ chức / Cá nhân
  isSupplier: boolean // Là nhà cung cấp (đối tượng dùng chung)
  isInternal: boolean // Đối tượng nội bộ
  isActive: boolean // Còn theo dõi (Ngừng sử dụng = false)
  debtReminderOn: boolean // Nhắc nợ tự động (khi còn công nợ)
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
  isActive?: boolean
  debtReminderOn?: boolean
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
  isActive?: boolean // true = chỉ KH đang theo dõi (picker chứng từ)
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
  account?: string // Mã TK công nợ (vd '131'); rỗng = tất cả
  aging?: ReceivableAging // Phân tích theo tuổi nợ
  status?: ReceivableStatus // Tình trạng nợ
  toDate?: string // Đến ngày (YYYY-MM-DD): số dư tính đến ngày này (voucherDate ≤ toDate)
}

// ── Thu tiền khách hàng theo hóa đơn (đối trừ chứng từ) ──────────────────────

// 1 chứng từ bán hàng còn phải thu của KH — dòng chọn trong form thu tiền.
export interface OpenReceivableVoucherDto {
  salesVoucherId: string
  voucherNo: string
  invoiceNo: string | null
  postingDate: string // Ngày hạch toán (ISO date-only)
  dueDate: string | null // Hạn thanh toán
  description: string | null
  totalAmount: string // Tổng tiền thanh toán
  paidAmount: string // Đã thu (đối trừ đã ghi sổ)
  remainingAmount: string // Còn phải thu = total − paid
}

// 1 dòng phân bổ tiền thu vào 1 chứng từ bán hàng.
export interface CollectPaymentAllocationInput {
  salesVoucherId: string
  amount: number // > 0, ≤ số còn phải thu của chứng từ
}

// Payload thu tiền khách hàng theo hóa đơn: sinh phiếu thu (TM) hoặc thu tiền
// gửi (CK) hạch toán Có 131 + ghi đối trừ vào từng chứng từ bán hàng.
export interface CollectPaymentInput {
  customerId: string
  postingDate: string
  voucherDate: string
  paymentMethod: PaymentMethod // Tiền mặt → phiếu thu; Chuyển khoản → thu tiền gửi
  bankAccountNo?: string | null // TKNH nhận tiền — bắt buộc khi chuyển khoản
  bankName?: string | null
  description?: string | null // Lý do thu; mặc định "Thu tiền khách hàng ..."
  allocations: CollectPaymentAllocationInput[]
}

// Kết quả thu tiền: chứng từ thu đã sinh.
export interface CollectPaymentResultDto {
  voucherId: string // id phiếu thu / thu tiền gửi
  voucherNo: string // số PT / NTTK
  totalAmount: string // tổng tiền đã thu
}
