// Type request/response phân hệ Tổng hợp — Chứng từ nghiệp vụ khác (NVK), dùng chung FE ↔ BE.

// Dòng hạch toán (bút toán) của chứng từ nghiệp vụ khác.
export interface GeneralVoucherLineDto {
  id: string
  lineNo: number
  description: string | null
  debitAccount: string // TK Nợ — tự nhập, không có TK mặc định
  creditAccount: string // TK Có — tự nhập
  amount: string // Decimal serialize thành string (đồng, không float)
  partnerId: string | null // Đối tượng
  partnerName: string | null
}

// Chứng từ nghiệp vụ khác.
export interface GeneralVoucherDto {
  id: string
  voucherNo: string // vd NVK261/2025
  postingDate: string // Ngày hạch toán (ISO)
  voucherDate: string // Ngày chứng từ (ISO)
  description: string | null // Diễn giải
  totalAmount: string // Σ số tiền dòng
  branchId: string | null
  posted: boolean // Đã ghi sổ — bỏ ghi thì loại khỏi sổ/báo cáo
  lines: GeneralVoucherLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload tạo dòng hạch toán.
export interface CreateGeneralVoucherLineInput {
  description?: string | null
  debitAccount: string
  creditAccount: string
  amount: number
  partnerId?: string | null
  partnerName?: string | null
}

// Payload tạo chứng từ nghiệp vụ khác.
export interface CreateGeneralVoucherInput {
  postingDate: string
  voucherDate: string
  description?: string | null
  branchId?: string | null
  lines: CreateGeneralVoucherLineInput[]
}

export type UpdateGeneralVoucherInput = Partial<CreateGeneralVoucherInput>

// Tham số lọc danh sách chứng từ nghiệp vụ khác.
export interface GeneralVoucherFilter {
  page?: number
  pageSize?: number
  fromDate?: string
  toDate?: string
  keyword?: string
}
