// Type request/response báo cáo phân hệ Mua hàng — dùng chung FE ↔ BE.
// Mọi số tiền/số lượng là Decimal serialize thành string (đồng, không float).

// Kỳ báo cáo (bắt buộc cả 2 đầu); supplierId lọc riêng 2 báo cáo công nợ NCC.
export interface PurchaseReportFilter {
  fromDate: string // ISO date (yyyy-mm-dd)
  toDate: string
  supplierId?: string
}

// ── Sổ chi tiết mua hàng ──────────────────────────────────────────────────────

// 1 dòng hàng của chứng từ mua hàng trong kỳ.
export interface PurchaseDetailRowDto {
  voucherId: string
  postingDate: string // Ngày hạch toán
  voucherDate: string // Ngày chứng từ
  voucherNo: string
  invoiceNo: string | null
  supplierName: string | null
  description: string | null // Diễn giải chứng từ
  itemName: string | null // null với dữ liệu nhập khẩu gộp 1 dòng
  unit: string | null
  quantity: string
  unitPrice: string
  amount: string // Thành tiền (chưa thuế)
  vatAmount: string
  totalPayment: string // amount + vatAmount của dòng
}

export interface PurchaseDetailReportDto {
  fromDate: string
  toDate: string
  totalAmount: string // Σ tiền hàng
  totalVat: string // Σ thuế GTGT
  totalPayment: string // Σ tổng thanh toán
  rows: PurchaseDetailRowDto[]
}

// ── Tổng hợp mua hàng theo mặt hàng ──────────────────────────────────────────

export interface PurchaseByItemRowDto {
  itemId: string | null
  itemName: string | null // null → FE hiển thị "(Không chọn mặt hàng)"
  unit: string | null
  quantity: string
  amount: string
  vatAmount: string
  total: string // amount + vatAmount
}

export interface PurchaseByItemReportDto {
  fromDate: string
  toDate: string
  totalAmount: string
  totalVat: string
  totalPayment: string
  rows: PurchaseByItemRowDto[]
}

// ── Công nợ phải trả nhà cung cấp (TK 331) ───────────────────────────────────
// Quy ước: chứng từ mua UNPAID ghi Có 331; phiếu chi tiền mặt/tiền gửi ghi Nợ 331.
// Chứng từ mua thanh toán ngay (IMMEDIATE) không vào công nợ.
// Số dư là dư Có (phải trả); giá trị âm = dư Nợ (trả thừa/ứng trước).

// 1 dòng NCC trong báo cáo tổng hợp.
export interface SupplierPayableSummaryRowDto {
  supplierId: string | null // null nếu chứng từ chỉ có tên NCC (dữ liệu nhập khẩu)
  supplierCode: string | null
  supplierName: string
  openingBalance: string // Dư Có đầu kỳ
  creditAmount: string // Phát sinh Có trong kỳ (mua chưa trả)
  debitAmount: string // Phát sinh Nợ trong kỳ (đã trả)
  closingBalance: string // Dư Có cuối kỳ
}

export interface SupplierPayableSummaryReportDto {
  fromDate: string
  toDate: string
  totalOpening: string
  totalCredit: string
  totalDebit: string
  totalClosing: string
  rows: SupplierPayableSummaryRowDto[]
}

// Nguồn chứng từ của dòng chi tiết công nợ.
export type SupplierPayableSource = 'PURCHASE' | 'CASH' | 'BANK'

// 1 chứng từ phát sinh công nợ của 1 NCC, kèm số dư lũy kế sau chứng từ đó.
export interface SupplierPayableDetailRowDto {
  voucherId: string
  source: SupplierPayableSource
  postingDate: string
  voucherNo: string
  description: string | null
  debitAmount: string // '0' nếu là chứng từ mua
  creditAmount: string // '0' nếu là chứng từ trả tiền
  balance: string // Dư Có lũy kế
}

// Nhóm chi tiết công nợ theo 1 NCC.
export interface SupplierPayableDetailGroupDto {
  supplierId: string | null
  supplierCode: string | null
  supplierName: string
  openingBalance: string
  creditAmount: string
  debitAmount: string
  closingBalance: string
  rows: SupplierPayableDetailRowDto[]
}

export interface SupplierPayableDetailReportDto {
  fromDate: string
  toDate: string
  totalOpening: string
  totalCredit: string
  totalDebit: string
  totalClosing: string
  groups: SupplierPayableDetailGroupDto[]
}
