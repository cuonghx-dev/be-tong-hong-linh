// Type request/response báo cáo phân hệ Bán hàng — dùng chung FE ↔ BE.
// Mọi số tiền/số lượng là Decimal serialize thành string (đồng, không float).

// Kỳ báo cáo (bắt buộc cả 2 đầu); customerId lọc riêng 2 báo cáo công nợ KH.
export interface SalesReportFilter {
  fromDate: string // ISO date (yyyy-mm-dd)
  toDate: string
  customerId?: string
}

// ── Sổ chi tiết bán hàng ──────────────────────────────────────────────────────

// 1 dòng hàng của chứng từ bán hàng trong kỳ.
export interface SalesDetailRowDto {
  voucherId: string
  postingDate: string // Ngày hạch toán
  voucherDate: string // Ngày chứng từ
  voucherNo: string
  customerName: string | null
  description: string | null // Diễn giải chứng từ
  itemName: string | null // null với dữ liệu nhập khẩu gộp 1 dòng
  unit: string | null
  quantity: string
  unitPrice: string
  discount: string // Chiết khấu thương mại của dòng
  amount: string // Doanh thu (đã trừ chiết khấu, chưa thuế)
  vatAmount: string
  totalPayment: string // amount + vatAmount của dòng
}

export interface SalesDetailReportDto {
  fromDate: string
  toDate: string
  totalDiscount: string // Σ chiết khấu
  totalAmount: string // Σ doanh thu
  totalVat: string // Σ thuế GTGT
  totalPayment: string // Σ tổng thanh toán
  rows: SalesDetailRowDto[]
}

// ── Tổng hợp bán hàng theo mặt hàng ──────────────────────────────────────────

export interface SalesByItemRowDto {
  itemId: string | null
  itemCode: string | null // Mã hàng từ danh mục (null nếu dòng gõ tay)
  itemName: string | null // null → FE hiển thị "(Không chọn mặt hàng)"
  unit: string | null
  quantity: string
  discount: string
  amount: string // Doanh thu (đã trừ chiết khấu, chưa thuế)
  vatAmount: string
  total: string // amount + vatAmount
}

export interface SalesByItemReportDto {
  fromDate: string
  toDate: string
  totalDiscount: string
  totalAmount: string
  totalVat: string
  totalPayment: string
  rows: SalesByItemRowDto[]
}

// ── Công nợ phải thu khách hàng (TK 131) ─────────────────────────────────────
// Quy ước: chứng từ bán UNPAID ghi Nợ 131; phiếu thu tiền mặt/tiền gửi ghi Có 131;
// chứng từ NVK hạch toán 131 tính cả 2 chiều (điều chỉnh, bù trừ công nợ).
// Chứng từ bán thu ngay (PAID_NOW) không vào công nợ.
// Số dư là dư Nợ (phải thu); giá trị âm = dư Có (KH trả thừa/ứng trước).

// 1 dòng KH trong báo cáo tổng hợp.
export interface CustomerReceivableSummaryRowDto {
  customerId: string | null // null nếu chứng từ chỉ có tên KH (dữ liệu nhập khẩu)
  customerCode: string | null
  customerName: string
  openingBalance: string // Dư Nợ đầu kỳ
  debitAmount: string // Phát sinh Nợ trong kỳ (bán chưa thu)
  creditAmount: string // Phát sinh Có trong kỳ (đã thu)
  closingBalance: string // Dư Nợ cuối kỳ
}

export interface CustomerReceivableSummaryReportDto {
  fromDate: string
  toDate: string
  totalOpening: string
  totalDebit: string
  totalCredit: string
  totalClosing: string
  rows: CustomerReceivableSummaryRowDto[]
}

// Nguồn chứng từ của dòng chi tiết công nợ.
export type CustomerReceivableSource = 'SALES' | 'CASH' | 'BANK' | 'GENERAL'

// 1 chứng từ phát sinh công nợ của 1 KH, kèm số dư lũy kế sau chứng từ đó.
export interface CustomerReceivableDetailRowDto {
  voucherId: string
  source: CustomerReceivableSource
  postingDate: string
  voucherNo: string
  description: string | null
  debitAmount: string // '0' nếu là chứng từ thu tiền
  creditAmount: string // '0' nếu là chứng từ bán hàng
  balance: string // Dư Nợ lũy kế
}

// Nhóm chi tiết công nợ theo 1 KH.
export interface CustomerReceivableDetailGroupDto {
  customerId: string | null
  customerCode: string | null
  customerName: string
  openingBalance: string
  debitAmount: string
  creditAmount: string
  closingBalance: string
  rows: CustomerReceivableDetailRowDto[]
}

export interface CustomerReceivableDetailReportDto {
  fromDate: string
  toDate: string
  totalOpening: string
  totalDebit: string
  totalCredit: string
  totalClosing: string
  groups: CustomerReceivableDetailGroupDto[]
}
