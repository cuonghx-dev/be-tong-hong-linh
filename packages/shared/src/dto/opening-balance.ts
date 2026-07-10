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
