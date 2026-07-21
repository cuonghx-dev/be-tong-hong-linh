// Type request/response phân hệ Tiền mặt (01-tien-mat) — dùng chung FE ↔ BE.
import type { CashVoucherCategory, CashVoucherType, PartnerType, PurchaseVoucherType } from '../enums'

// Dòng hạch toán (bút toán) của phiếu thu/chi.
export interface CashVoucherLineDto {
  id: string
  lineNo: number
  description: string | null
  debitAccount: string // TK Nợ (thu → 1111)
  creditAccount: string // TK Có (chi → 1111)
  amount: string // Decimal serialize thành string (đồng, không float)
  operation: string | null // Nghiệp vụ
  partnerId: string | null // Đối tượng
  partnerName: string | null
  costItemId: string | null // Khoản mục CP (chỉ PC - Chi khác)
  bankAccountNo: string | null // TK ngân hàng (gửi tiền vào NH)
  bankName: string | null
}

// Phiếu thu/chi.
export interface CashVoucherDto {
  id: string
  type: CashVoucherType
  category: CashVoucherCategory
  voucherNo: string // vd PT4461/2026 (PT liền) hoặc PC 0120/2026 (PC có dấu cách)
  postingDate: string // Ngày hạch toán (ISO)
  voucherDate: string // Ngày phiếu (ISO)
  partnerType: PartnerType | null
  partnerId: string | null
  partnerName: string | null
  payerReceiver: string | null // Người nộp (PT) / người nhận (PC)
  address: string | null
  employeeId: string | null
  reason: string | null // Lý do thu/chi
  attachmentCount: number
  totalAmount: string // Σ số tiền dòng
  branchId: string | null
  posted: boolean // Đã ghi sổ; bỏ ghi = còn nháp, loại khỏi sổ/báo cáo
  // Chứng từ bán hàng nguồn (PT SALES_CASH tự sinh) — FE "Xem" mở chứng từ bán hàng.
  salesVoucherId: string | null
  // Chứng từ mua hàng nguồn (PC PURCHASE_*_CASH tự sinh) — FE "Xem" mở chứng từ mua hàng/mua dịch vụ.
  purchaseVoucherId: string | null
  purchaseVoucherType: PurchaseVoucherType | null
  lines: CashVoucherLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hạch toán.
export interface CreateCashVoucherLineInput {
  description?: string | null
  debitAccount: string
  creditAccount: string
  amount: number
  operation?: string | null
  partnerId?: string | null
  partnerName?: string | null
  costItemId?: string | null
  bankAccountNo?: string | null
  bankName?: string | null
}

// Payload tạo phiếu thu/chi.
export interface CreateCashVoucherInput {
  type: CashVoucherType
  category: CashVoucherCategory
  postingDate: string
  voucherDate: string
  partnerType?: PartnerType | null
  partnerId?: string | null
  partnerName?: string | null
  payerReceiver?: string | null
  address?: string | null
  employeeId?: string | null
  reason?: string | null
  attachmentCount?: number
  branchId?: string | null
  lines: CreateCashVoucherLineInput[]
}

export type UpdateCashVoucherInput = Partial<Omit<CreateCashVoucherInput, 'type'>>

// Tham số lọc danh sách thu/chi.
export interface CashVoucherFilter {
  page?: number
  pageSize?: number
  type?: CashVoucherType
  category?: CashVoucherCategory
  partnerId?: string
  fromDate?: string
  toDate?: string
  keyword?: string
}
