// Type request/response phân hệ Mua hàng (03-mua-hang) — dùng chung FE ↔ BE.
import type {
  PaymentMethod,
  PurchaseOrigin,
  PurchasePaymentMode,
  PurchasePaymentStatus,
  PurchaseReceiveStatus,
  PurchaseVoucherType,
  SupplierType,
} from '../enums'

// ── Chứng từ mua hàng ────────────────────────────────────────────────────────

// Dòng hàng tiền của chứng từ mua hàng.
export interface PurchaseVoucherLineDto {
  id: string
  lineNo: number
  itemId: string | null // Mã hàng
  itemName: string | null // Tên hàng
  warehouseId: string | null // Kho (chỉ loại nhập kho)
  stockAccount: string | null // TK Kho (152/156/…)
  payableAccount: string // TK Công nợ (mặc định 331)
  unit: string | null // ĐVT
  quantity: string // Số lượng (Decimal → string)
  unitPrice: string // Đơn giá
  amount: string // Thành tiền
  vatRate: string // % Thuế GTGT
  vatAmount: string // Tiền thuế GTGT
  vatAccount: string // TK thuế GTGT (mặc định 1331)
}

// Chứng từ mua hàng.
export interface PurchaseVoucherDto {
  id: string
  type: PurchaseVoucherType
  origin: PurchaseOrigin // Nguồn gốc: trong nước / nhập khẩu
  paymentMode: PurchasePaymentMode
  paymentMethod: PaymentMethod | null // Khi thanh toán ngay
  receiveWithInvoice: boolean // Nhận kèm hóa đơn
  voucherNo: string // vd NK07099, MH0326/2025
  invoiceNo: string | null // Số hóa đơn
  postingDate: string // Ngày hạch toán (ISO date-only)
  voucherDate: string // Ngày chứng từ
  supplierId: string | null
  supplierName: string | null
  deliverer: string | null // Người giao hàng
  address: string | null
  employeeId: string | null // Nhân viên mua hàng
  description: string | null // Diễn giải
  attachmentCount: number // Kèm theo
  contractNo: string | null // Số hợp đồng mua
  paymentTermId: string | null // Điều khoản thanh toán
  creditDays: number | null // Số ngày được nợ
  dueDate: string | null // Hạn thanh toán
  totalGoods: string // Tổng tiền hàng
  totalVat: string // Thuế GTGT
  totalPayment: string // Tổng tiền thanh toán
  purchaseCost: string // Chi phí mua hàng
  stockValue: string // Giá trị nhập kho
  einvoiceLookupCode: string | null // Mã tra cứu HĐĐT
  einvoiceLookupUrl: string | null // Đường dẫn tra cứu HĐĐT
  receiveStatus: PurchaseReceiveStatus
  paymentStatus: PurchasePaymentStatus
  posted: boolean // Đã ghi sổ / bỏ ghi (loại khỏi sổ sách, không xóa dữ liệu)
  branchId: string | null
  lines: PurchaseVoucherLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hàng tiền.
export interface CreatePurchaseVoucherLineInput {
  itemId?: string | null
  itemName?: string | null
  warehouseId?: string | null
  stockAccount?: string | null
  payableAccount?: string | null
  unit?: string | null
  quantity: number
  unitPrice: number
  vatRate?: number
  vatAccount?: string | null
}

// Payload tạo chứng từ mua hàng.
export interface CreatePurchaseVoucherInput {
  type: PurchaseVoucherType
  origin?: PurchaseOrigin // Mặc định trong nước (DOMESTIC)
  paymentMode: PurchasePaymentMode
  paymentMethod?: PaymentMethod | null
  receiveWithInvoice?: boolean
  invoiceNo?: string | null
  postingDate: string
  voucherDate: string
  supplierId?: string | null
  supplierName?: string | null
  deliverer?: string | null
  address?: string | null
  employeeId?: string | null
  description?: string | null
  attachmentCount?: number
  contractNo?: string | null
  paymentTermId?: string | null
  creditDays?: number | null
  dueDate?: string | null
  purchaseCost?: number
  einvoiceLookupCode?: string | null
  einvoiceLookupUrl?: string | null
  branchId?: string | null
  lines: CreatePurchaseVoucherLineInput[]
}

// Sửa chứng từ — không cho đổi loại chứng từ (type) sau khi tạo.
export type UpdatePurchaseVoucherInput = Partial<Omit<CreatePurchaseVoucherInput, 'type'>>

// Tham số lọc danh sách mua hàng.
export interface PurchaseVoucherFilter {
  page?: number
  pageSize?: number
  type?: PurchaseVoucherType
  supplierId?: string
  receiveStatus?: PurchaseReceiveStatus
  paymentStatus?: PurchasePaymentStatus
  fromDate?: string
  toDate?: string
  keyword?: string
}

// ── Nhà cung cấp ─────────────────────────────────────────────────────────────

export interface SupplierDto {
  id: string
  code: string // Mã NCC
  name: string
  type: SupplierType
  isCustomer: boolean // Là khách hàng (đối tượng dùng chung)
  taxCode: string | null // Mã số thuế/CCCD
  budgetRelationCode: string | null // Mã số ĐVQHNS
  phone: string | null
  website: string | null
  address: string | null
  groupId: string | null // Nhóm NCC
  employeeId: string | null // Nhân viên mua hàng
  isInternal: boolean // Đối tượng nội bộ
  debtAmount: string // Số tiền nợ
  invoiceRisk: string | null // Rủi ro về hóa đơn
  isActive: boolean // Ngừng sử dụng = false (ẩn khỏi picker, giữ dữ liệu cũ)
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierInput {
  code: string
  name: string
  type?: SupplierType
  isCustomer?: boolean
  taxCode?: string | null
  budgetRelationCode?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  groupId?: string | null
  employeeId?: string | null
  isInternal?: boolean
  invoiceRisk?: string | null
  isActive?: boolean
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>

export interface SupplierFilter {
  page?: number
  pageSize?: number
  keyword?: string
  groupId?: string
  isActive?: boolean // true = chỉ NCC đang sử dụng (picker chứng từ)
}

