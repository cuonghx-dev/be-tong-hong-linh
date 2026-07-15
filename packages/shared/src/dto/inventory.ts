// Type request/response phân hệ Kho — Nhập kho + Xuất kho (05-kho) — dùng chung FE ↔ BE.
import type { GoodsIssueCategory, InventoryReceiptType } from '../enums'

// ── Phiếu nhập kho ───────────────────────────────────────────────────────────

// Dòng hàng của phiếu nhập kho (bút toán kép: TK Nợ = kho, TK Có = đối ứng).
export interface InventoryReceiptLineDto {
  id: string
  lineNo: number
  itemId: string | null // Mã hàng
  itemName: string | null // Tên hàng
  warehouseId: string | null // Kho
  debitAccount: string | null // TK Nợ (kho 152/155/156)
  creditAccount: string | null // TK Có (đối ứng 331/154/632/…)
  unit: string | null // ĐVT
  quantity: string // Số lượng (Decimal → string)
  unitPrice: string // Đơn giá
  amount: string // Thành tiền
  lotNo: string | null // Số lô
  expiryDate: string | null // Hạn sử dụng (ISO date-only)
}

// Phiếu nhập kho.
export interface InventoryReceiptDto {
  id: string
  receiptType: InventoryReceiptType
  voucherNo: string // vd NK07099
  postingDate: string // Ngày hạch toán (ISO date-only)
  voucherDate: string // Ngày chứng từ
  partnerId: string | null // Mã đối tượng
  partnerName: string | null // Tên đối tượng
  address: string | null // Địa chỉ
  deliverer: string | null // Người giao hàng
  description: string | null // Diễn giải
  reference: string | null // Tham chiếu
  attachmentCount: number // Kèm theo (chứng từ gốc)
  totalAmount: string // Tổng tiền
  branchName: string | null // Chi nhánh
  posted: boolean // Đã ghi sổ; bỏ ghi = còn nháp, loại khỏi sổ/báo cáo
  lines: InventoryReceiptLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hàng.
export interface CreateInventoryReceiptLineInput {
  itemId?: string | null
  itemName?: string | null
  warehouseId?: string | null
  debitAccount?: string | null
  creditAccount?: string | null
  unit?: string | null
  quantity: number
  unitPrice: number
  lotNo?: string | null
  expiryDate?: string | null
}

// Payload tạo phiếu nhập kho.
export interface CreateInventoryReceiptInput {
  receiptType: InventoryReceiptType
  postingDate: string
  voucherDate: string
  partnerId?: string | null
  partnerName?: string | null
  address?: string | null
  deliverer?: string | null
  description?: string | null
  reference?: string | null
  attachmentCount?: number
  branchName?: string | null
  lines: CreateInventoryReceiptLineInput[]
}

// Sửa phiếu — không cho đổi loại chứng từ (receiptType) sau khi tạo.
export type UpdateInventoryReceiptInput = Partial<Omit<CreateInventoryReceiptInput, 'receiptType'>>

// Tham số lọc danh sách nhập kho.
export interface InventoryReceiptFilter {
  page?: number
  pageSize?: number
  receiptType?: InventoryReceiptType
  fromDate?: string
  toDate?: string
  keyword?: string
}

// ── Phiếu xuất kho ───────────────────────────────────────────────────────────

// Dòng hàng của phiếu xuất kho (bút toán kép: TK Nợ = giá vốn/CP, TK Có = kho).
export interface GoodsIssueLineDto {
  id: string
  lineNo: number
  itemId: string | null // Mã hàng
  itemName: string | null // Tên hàng
  warehouseId: string | null // Kho
  debitAccount: string // TK Nợ (giá vốn 632 / chi phí 621…)
  creditAccount: string // TK Có (kho 152/155/156)
  unit: string | null // ĐVT
  quantity: string // Số lượng (Decimal → string)
  unitPrice: string // Đơn giá
  amount: string // Thành tiền
  lotNo: string | null // Số lô
  expiryDate: string | null // Hạn sử dụng (ISO date-only)
}

// Phiếu xuất kho.
export interface GoodsIssueDto {
  id: string
  category: GoodsIssueCategory
  voucherNo: string // vd XK10601/2025
  postingDate: string // Ngày hạch toán (ISO date-only)
  voucherDate: string // Ngày chứng từ
  customerId: string | null // Mã khách hàng
  customerName: string | null // Tên khách hàng
  receiver: string | null // Người nhận
  address: string | null // Địa chỉ
  salesEmployeeId: string | null // Nhân viên bán hàng
  description: string | null // Lý do xuất / Diễn giải
  attachmentCount: number // Kèm theo (chứng từ gốc)
  deliveryLocation: string | null // Địa điểm giao hàng
  totalAmount: string // Tổng tiền
  salesDocStatus: string | null // Đã lập CT bán hàng (từ nhập khẩu)
  invoiceIssueStatus: string | null // TT phát hành hóa đơn (từ nhập khẩu)
  taxAuthorityCode: string | null // Mã CQT cấp (từ nhập khẩu)
  posted: boolean // Đã ghi sổ (false = bỏ ghi / nháp)
  lines: GoodsIssueLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hàng.
export interface CreateGoodsIssueLineInput {
  itemId?: string | null
  itemName?: string | null
  warehouseId?: string | null
  debitAccount?: string | null
  creditAccount?: string | null
  unit?: string | null
  quantity: number
  unitPrice: number
  lotNo?: string | null
  expiryDate?: string | null
}

// Payload tạo phiếu xuất kho.
export interface CreateGoodsIssueInput {
  category: GoodsIssueCategory
  postingDate: string
  voucherDate: string
  customerId?: string | null
  customerName?: string | null
  receiver?: string | null
  address?: string | null
  salesEmployeeId?: string | null
  description?: string | null
  attachmentCount?: number
  deliveryLocation?: string | null
  lines: CreateGoodsIssueLineInput[]
}

// Sửa phiếu — không cho đổi lý do xuất (category) sau khi tạo.
export type UpdateGoodsIssueInput = Partial<Omit<CreateGoodsIssueInput, 'category'>>

// Tham số lọc danh sách xuất kho.
export interface GoodsIssueFilter {
  page?: number
  pageSize?: number
  category?: GoodsIssueCategory
  fromDate?: string
  toDate?: string
  keyword?: string
}

