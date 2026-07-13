// Type request/response báo cáo Tổng hợp (Sổ sách kế toán) — dùng chung FE ↔ BE.
// Mọi số tiền là Decimal serialize thành string (đồng, không float).

// Kỳ báo cáo Sổ nhật ký chung (phân trang theo chứng từ).
export interface GeneralJournalFilter {
  fromDate: string // ISO date (yyyy-mm-dd)
  toDate: string
  page?: number
  pageSize?: number
}

// Kỳ báo cáo Sổ chi tiết các tài khoản.
export interface AccountLedgerFilter {
  fromDate: string
  toDate: string
  accountCode?: string // bỏ trống = mọi TK có số dư/phát sinh
}

// ── Sổ nhật ký chung (S03a-DNN) ──────────────────────────────────────────────

// 1 dòng sổ = 1 vế (Nợ hoặc Có) của 1 bút toán; 1 bút toán sinh 2 dòng liền nhau.
export interface GeneralJournalRowDto {
  description: string | null // Diễn giải dòng, fallback diễn giải chứng từ
  account: string // Số hiệu TK
  debitAmount: string // Số phát sinh Nợ ('0' nếu là dòng Có)
  creditAmount: string // Số phát sinh Có ('0' nếu là dòng Nợ)
}

// Chứng từ gộp nhóm trong sổ (mọi loại: thu/chi tiền, mua, bán, kho, NVK…).
export interface GeneralJournalVoucherDto {
  postingDate: string // Ngày ghi sổ (hạch toán)
  voucherDate: string // Ngày chứng từ
  voucherNo: string
  voucherKind: string // Nhãn loại chứng từ hiển thị (Phiếu thu, Bán hàng…)
  rows: GeneralJournalRowDto[]
}

export interface GeneralJournalReportDto {
  fromDate: string
  toDate: string
  page: number
  pageSize: number
  totalVouchers: number // tổng chứng từ toàn kỳ (để phân trang)
  totalDebit: string // Σ PS Nợ toàn kỳ (= totalCredit nếu dữ liệu cân)
  totalCredit: string
  vouchers: GeneralJournalVoucherDto[]
}

// ── Sổ chi tiết các tài khoản (S03b-DNN) ─────────────────────────────────────

// 1 dòng phát sinh của 1 TK kèm số dư lũy kế sau nghiệp vụ.
export interface AccountLedgerRowDto {
  postingDate: string
  voucherDate: string
  voucherNo: string
  voucherKind: string
  description: string | null
  counterAccount: string // TK đối ứng
  debitAmount: string
  creditAmount: string
  balanceDebit: string // Dư Nợ sau nghiệp vụ ('0' nếu dư Có)
  balanceCredit: string // Dư Có sau nghiệp vụ ('0' nếu dư Nợ)
}

// Sổ của 1 TK: dư đầu + phát sinh + dư cuối (dư = |Nợ − Có|, ghi về đúng cột).
export interface AccountLedgerSectionDto {
  accountCode: string
  accountName: string | null // tên TK từ danh mục accounts (null nếu chưa khai)
  openingDebit: string
  openingCredit: string
  totalDebit: string
  totalCredit: string
  closingDebit: string
  closingCredit: string
  rows: AccountLedgerRowDto[]
}

export interface AccountLedgerReportDto {
  fromDate: string
  toDate: string
  sections: AccountLedgerSectionDto[]
}
