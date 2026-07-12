// Type request/response báo cáo phân hệ Tiền gửi — dùng chung FE ↔ BE.
// Mọi số tiền là Decimal serialize thành string (đồng, không float).

// Kỳ báo cáo + lọc theo TK ngân hàng (tùy chọn).
export interface BankReportFilter {
  fromDate: string // ISO date (yyyy-mm-dd)
  toDate: string
  bankAccountNo?: string
}

// Bảng kê số dư ngân hàng chỉ cần 1 mốc thời điểm.
export interface BankBalanceFilter {
  toDate: string
}

// ── Sổ tiền gửi ngân hàng ────────────────────────────────────────────────────

// 1 dòng hạch toán chạm TK 112x kèm số dư lũy kế sau dòng đó.
export interface BankBookRowDto {
  voucherId: string
  voucherSource: 'BANK' | 'CASH' // chứng từ tiền gửi hay phiếu thu/chi (gửi/rút tiền NH)
  voucherType: 'RECEIPT' | 'PAYMENT' // loại chứng từ gốc — FE truyền ?type= khi mở trang xem
  postingDate: string // Ngày hạch toán
  voucherDate: string // Ngày chứng từ
  voucherNo: string
  description: string | null
  counterAccount: string // TK đối ứng ('' với dữ liệu nhập khẩu thiếu định khoản)
  receiptAmount: string // Thu (gửi vào) — '0' nếu là dòng chi
  paymentAmount: string // Chi (rút ra) — '0' nếu là dòng thu
  balance: string // Số dư lũy kế (BE tính bằng Decimal)
}

// 1 section = 1 TK ngân hàng (bankAccountNo = '' nếu chứng từ chưa chọn TKNH).
export interface BankBookSectionDto {
  bankAccountNo: string
  bankName: string | null
  openingBalance: string
  totalReceipt: string
  totalPayment: string
  closingBalance: string
  rows: BankBookRowDto[]
}

export interface BankBookReportDto {
  fromDate: string
  toDate: string
  sections: BankBookSectionDto[]
}

// ── Bảng kê số dư ngân hàng (tại ngày toDate) ────────────────────────────────

export interface BankBalanceRowDto {
  bankAccountNo: string
  bankName: string | null
  bankBranch: string | null
  balance: string
}

export interface BankBalanceReportDto {
  toDate: string
  totalBalance: string
  rows: BankBalanceRowDto[]
}

// Bảng kê số dư tiền theo ngày (bản tiền gửi) dùng lại
// DailyBalanceReportDto/DailyBalanceRowDto từ ./cash-report (shape giống hệt).
