// Type request/response phân hệ Mua hàng (03-mua-hang) — dùng chung FE ↔ BE.
import type {
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
  origin: PurchaseOrigin // Nguồn gốc: trong nước
  paymentMode: PurchasePaymentMode
  receiveWithInvoice: boolean // Nhận kèm hóa đơn
  isPurchaseCost: boolean // Là chi phí mua hàng (chỉ mua dịch vụ) — được chọn phân bổ CP
  voucherNo: string // vd NK07099, MH0326/2025
  invoiceTemplate: string | null // Mẫu số hóa đơn (vd 01GTKT0/001)
  invoiceSeries: string | null // Ký hiệu hóa đơn (vd 1C24TYY)
  invoiceNo: string | null // Số hóa đơn
  invoiceDate: string | null // Ngày hóa đơn (ISO date-only)
  postingDate: string // Ngày hạch toán (ISO date-only)
  voucherDate: string // Ngày chứng từ
  supplierId: string | null // row id trong DB
  supplierCode: string | null // mã NCC danh mục — dùng cho picker / điều hướng trả tiền
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
  paymentId: string | null // Phiếu chi tự sinh (thanh toán ngay tiền mặt)
  paymentNo?: string | null // Số phiếu chi tự sinh (chỉ trả ở API chi tiết)
  receiptId: string | null // Phiếu nhập kho tự sinh (loại nhập kho)
  receiptNo?: string | null // Số phiếu nhập tự sinh (chỉ trả ở API chi tiết)
  receiveStatus: PurchaseReceiveStatus
  paymentStatus: PurchasePaymentStatus
  posted: boolean // Đã ghi sổ / bỏ ghi (loại khỏi sổ sách, không xóa dữ liệu)
  branchId: string | null
  lines: PurchaseVoucherLineDto[]
  // Tab Chi phí (§10.4) — chỉ trả ở API chi tiết; danh sách không kèm.
  costAllocations?: PurchaseCostAllocationDto[]
  createdAt: string
  updatedAt: string
}

// Dòng phân bổ chi phí mua hàng (tab Chi phí, §10.4).
export interface PurchaseCostAllocationDto {
  costVoucherId: string // Chứng từ chi phí (mua dịch vụ)
  voucherNo: string
  postingDate: string
  voucherDate: string
  supplierName: string | null
  totalCost: string // Tổng chi phí = tiền hàng chưa thuế của chứng từ CP
  allocatedTotal: string // Lũy kế số đã phân bổ (mọi phiếu, gồm dòng này)
  amount: string // Số phân bổ lần này
}

// Ứng viên chứng từ chi phí cho dialog "Chọn chứng từ CP".
export interface CostVoucherOptionDto {
  id: string
  voucherNo: string
  postingDate: string
  voucherDate: string
  supplierName: string | null
  totalCost: string
  allocatedTotal: string
  remaining: string // Còn được phân bổ = totalCost − allocatedTotal
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
  receiveWithInvoice?: boolean
  isPurchaseCost?: boolean // Là chi phí mua hàng (chỉ có nghĩa với mua dịch vụ)
  invoiceTemplate?: string | null
  invoiceSeries?: string | null
  invoiceNo?: string | null
  invoiceDate?: string | null
  postingDate: string
  voucherDate: string
  supplierId?: string | null
  supplierName: string // Bắt buộc — chứng từ mua hàng phải có tên NCC
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
  // Phân bổ chi phí (tab Chi phí): gửi kèm → thay toàn bộ, purchaseCost = Σ amount.
  costAllocations?: { costVoucherId: string; amount: number }[]
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
  debtAmount: string // Số tiền nợ — công nợ 331 hiện tại, BE tính runtime (không lưu DB)
  invoiceRisk: string | null // Rủi ro về hóa đơn
  isActive: boolean // Ngừng sử dụng = false (ẩn khỏi picker, giữ dữ liệu cũ)
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierInput {
  code: string
  name: string
  type: SupplierType
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

