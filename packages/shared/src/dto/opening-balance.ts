// Type request/response phân hệ Số dư ban đầu — Số dư tài khoản, dùng chung FE ↔ BE.

// 1 dòng số dư tài khoản đầu kỳ.
export interface AccountOpeningBalanceDto {
  id: string
  accountCode: string // Số tài khoản (vd 111, 1111)
  accountName: string // Tên tài khoản
  debitAmount: string // Dư Nợ — Decimal serialize thành string (đồng, không float)
  creditAmount: string // Dư Có
  createdAt: string
  updatedAt: string
}

// Payload 1 dòng khi lưu cả bảng số dư.
export interface SaveAccountOpeningBalanceLineInput {
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
}

// Payload lưu toàn bộ bảng số dư tài khoản (thay thế dữ liệu cũ).
export interface SaveAccountOpeningBalancesInput {
  items: SaveAccountOpeningBalanceLineInput[]
}

// ── Số dư công nợ đầu kỳ chi tiết theo đối tượng (khách hàng/NCC) ──────────────

// Loại đối tượng công nợ theo TK: khách hàng (131) hoặc nhà cung cấp (331).
export type OpeningBalancePartnerType = 'CUSTOMER' | 'SUPPLIER'

// 1 dòng số dư công nợ của 1 đối tượng cho 1 TK công nợ (vd 131 theo từng KH, 331 theo từng NCC).
export interface PartnerOpeningBalanceDto {
  partnerId: string
  partnerCode: string // Mã đối tượng (KH/NCC)
  partnerName: string // Tên đối tượng
  debitAmount: string // Dư Nợ — Decimal serialize thành string
  creditAmount: string // Dư Có
}

// Danh sách số dư công nợ theo TK: mọi đối tượng + số dư (0 nếu chưa nhập).
export interface PartnerOpeningBalanceListDto {
  accountCode: string
  accountName: string
  partnerType: OpeningBalancePartnerType
  items: PartnerOpeningBalanceDto[]
}

// Payload 1 dòng khi lưu số dư công nợ.
export interface SavePartnerOpeningBalanceLineInput {
  partnerId: string
  debitAmount: number
  creditAmount: number
}

// Payload lưu toàn bộ số dư công nợ của 1 TK (thay thế dữ liệu cũ của TK đó).
export interface SavePartnerOpeningBalancesInput {
  accountCode: string
  items: SavePartnerOpeningBalanceLineInput[]
}

// 1 dòng số dư tiền gửi của 1 tài khoản ngân hàng cho 1 TK tiền gửi (vd 1121 theo từng TK NH).
export interface BankAccountOpeningBalanceDto {
  bankAccountId: string
  accountNumber: string // Số TK ngân hàng
  bankName: string // Tên ngân hàng
  debitAmount: string // Dư Nợ — Decimal serialize thành string
  creditAmount: string // Dư Có
}

// Danh sách số dư tiền gửi theo TK: mọi TK ngân hàng + số dư (0 nếu chưa nhập).
export interface BankAccountOpeningBalanceListDto {
  accountCode: string
  accountName: string
  items: BankAccountOpeningBalanceDto[]
}

// Payload 1 dòng khi lưu số dư tiền gửi.
export interface SaveBankAccountOpeningBalanceLineInput {
  bankAccountId: string
  debitAmount: number
  creditAmount: number
}

// Payload lưu toàn bộ số dư tiền gửi của 1 TK (thay thế dữ liệu cũ của TK đó).
export interface SaveBankAccountOpeningBalancesInput {
  accountCode: string
  items: SaveBankAccountOpeningBalanceLineInput[]
}
