// Type request/response báo cáo phân hệ Tiền mặt — dùng chung FE ↔ BE.
// Mọi số tiền là Decimal serialize thành string (đồng, không float).

// Kỳ báo cáo (bắt buộc cả 2 đầu).
export interface CashReportFilter {
  fromDate: string // ISO date (yyyy-mm-dd)
  toDate: string
}

// ── Sổ nhật ký thu tiền (S03a1-DNN) / chi tiền (S03a2-DNN) ────────────────────

// 1 dòng hạch toán thu/chi tiền mặt trong kỳ.
export interface CashJournalRowDto {
  voucherId: string
  postingDate: string // Ngày hạch toán (ngày ghi sổ)
  voucherDate: string // Ngày chứng từ
  voucherNo: string
  description: string | null // Diễn giải dòng, fallback lý do thu/chi
  counterAccount: string // TK đối ứng (S03a1: ghi Có; S03a2: ghi Nợ)
  amount: string
}

export interface CashJournalReportDto {
  fromDate: string
  toDate: string
  totalAmount: string // Σ cột số tiền trong kỳ
  rows: CashJournalRowDto[]
}

// ── Sổ kế toán chi tiết quỹ tiền mặt ─────────────────────────────────────────

// 1 dòng hạch toán (thu hoặc chi) kèm tồn quỹ lũy kế sau dòng đó.
export interface CashBookRowDto {
  voucherId: string
  postingDate: string
  voucherDate: string
  receiptNo: string | null // Số phiếu thu (null nếu là dòng chi)
  paymentNo: string | null // Số phiếu chi (null nếu là dòng thu)
  description: string | null
  counterAccount: string // TK đối ứng
  receiptAmount: string // Thu ('0' nếu là dòng chi)
  paymentAmount: string // Chi ('0' nếu là dòng thu)
  balance: string // Tồn quỹ lũy kế (BE tính bằng Decimal)
}

export interface CashBookReportDto {
  fromDate: string
  toDate: string
  openingBalance: string // Số dư đầu kỳ (khai báo + phát sinh trước kỳ)
  totalReceipt: string
  totalPayment: string
  closingBalance: string
  rows: CashBookRowDto[]
}

// ── Bảng kê số dư tiền theo ngày ─────────────────────────────────────────────

// 1 ngày có phát sinh thu/chi trong kỳ.
export interface DailyBalanceRowDto {
  date: string
  openingBalance: string // Tồn đầu ngày
  receiptAmount: string
  paymentAmount: string
  closingBalance: string // Tồn cuối ngày
}

export interface DailyBalanceReportDto {
  fromDate: string
  toDate: string
  openingBalance: string
  totalReceipt: string
  totalPayment: string
  closingBalance: string
  rows: DailyBalanceRowDto[]
}
