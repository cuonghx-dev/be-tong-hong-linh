// Type request/response phân hệ Tiền gửi (02-tien-gui) — dùng chung FE ↔ BE.
import type { BankPaymentMethod, BankVoucherCategory, BankVoucherType, PartnerType } from '../enums'

// Dòng hạch toán (bút toán) của chứng từ thu/chi tiền gửi.
export interface BankVoucherLineDto {
  id: string
  lineNo: number
  description: string | null
  debitAccount: string // TK Nợ (thu → 1121)
  creditAccount: string // TK Có (chi → 1121)
  amount: string // Decimal serialize thành string (đồng, không float)
  partnerId: string | null // Đối tượng
  partnerName: string | null
}

// Chứng từ thu (NTTK) / chi (UNC) tiền gửi.
export interface BankVoucherDto {
  id: string
  type: BankVoucherType
  category: BankVoucherCategory
  voucherNo: string // vd NTTK1434/2026 (thu) hoặc UNC553/2026 (chi)
  paymentMethod: BankPaymentMethod | null // Phương thức thanh toán — chỉ chi (UNC)
  isBatchTransfer: boolean // "Là UNC chuyển tiền theo lô" — chỉ chi
  internalRef: string | null // Số UNC từ chi nhánh khác chuyển đến — chỉ thu
  postingDate: string // Ngày hạch toán (ISO)
  voucherDate: string // Ngày chứng từ (ISO)
  bankAccountNo: string | null // TK ngân hàng của đơn vị (nộp vào / tài khoản chi / tài khoản đi)
  bankName: string | null // Tên ngân hàng (auto theo TK)
  receiverAccountNo: string | null // Tài khoản nhận (chi) / tài khoản đến (CTNB)
  receiverBankName: string | null // Tên ngân hàng tài khoản nhận (chi) / tài khoản đến (CTNB)
  partnerType: PartnerType | null
  partnerId: string | null
  partnerName: string | null
  address: string | null
  employeeId: string | null
  reason: string | null // Lý do thu / nội dung thanh toán
  reference: string | null // Tham chiếu
  attachmentCount: number
  totalAmount: string // Σ số tiền dòng
  branchId: string | null
  posted: boolean // Đã ghi sổ; bỏ ghi = còn nháp, loại khỏi sổ/báo cáo
  lines: BankVoucherLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hạch toán.
export interface CreateBankVoucherLineInput {
  description?: string | null
  debitAccount: string
  creditAccount: string
  amount: number
  partnerId?: string | null
  partnerName?: string | null
}

// Payload tạo chứng từ thu/chi tiền gửi.
export interface CreateBankVoucherInput {
  type: BankVoucherType
  category: BankVoucherCategory
  paymentMethod?: BankPaymentMethod | null
  isBatchTransfer?: boolean
  internalRef?: string | null
  postingDate: string
  voucherDate: string
  bankAccountNo: string // Bắt buộc — chứng từ tiền gửi phải gắn TK ngân hàng (CTNB: tài khoản đi)
  bankName?: string | null
  receiverAccountNo?: string | null // Tài khoản nhận (chi) / tài khoản đến (CTNB — bắt buộc)
  receiverBankName?: string | null
  partnerType?: PartnerType | null
  partnerId?: string | null
  partnerName?: string | null
  address?: string | null
  employeeId?: string | null
  reason?: string | null
  reference?: string | null
  attachmentCount?: number
  branchId?: string | null
  lines: CreateBankVoucherLineInput[]
}

export type UpdateBankVoucherInput = Partial<Omit<CreateBankVoucherInput, 'type'>>

// Tham số lọc danh sách thu/chi tiền gửi.
export interface BankVoucherFilter {
  page?: number
  pageSize?: number
  type?: BankVoucherType
  category?: BankVoucherCategory
  partnerId?: string
  bankAccountNo?: string
  fromDate?: string
  toDate?: string
  keyword?: string
}
