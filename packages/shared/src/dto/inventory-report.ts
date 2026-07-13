// Type request/response báo cáo phân hệ Kho — dùng chung FE ↔ BE.
// Mọi số lượng/số tiền là Decimal serialize thành string (không float).

// Kỳ báo cáo tổng hợp tồn kho + lọc theo kho / từ khóa mã-tên VTHH (tùy chọn).
export interface StockSummaryFilter {
  fromDate: string // ISO date (yyyy-mm-dd)
  toDate: string
  warehouseCode?: string
  keyword?: string
}

// Sổ chi tiết vật tư hàng hóa — bắt buộc chọn 1 VTHH (mã).
export interface ItemLedgerFilter {
  fromDate: string
  toDate: string
  itemCode: string
  warehouseCode?: string
}

// ── Tổng hợp tồn kho ─────────────────────────────────────────────────────────

// 1 dòng = 1 VTHH: tồn đầu kỳ / nhập / xuất / tồn cuối kỳ (SL + giá trị).
export interface StockSummaryRowDto {
  itemCode: string
  itemName: string | null
  unit: string | null
  openingQty: string
  openingAmount: string
  inQty: string
  inAmount: string
  outQty: string
  outAmount: string
  closingQty: string
  closingAmount: string
}

export interface StockSummaryReportDto {
  fromDate: string
  toDate: string
  rows: StockSummaryRowDto[]
  // Tổng cộng chỉ có ý nghĩa với giá trị (SL khác đơn vị tính không cộng được).
  totalOpeningAmount: string
  totalInAmount: string
  totalOutAmount: string
  totalClosingAmount: string
}

// ── Sổ chi tiết vật tư hàng hóa ──────────────────────────────────────────────

// 1 dòng nhập/xuất của VTHH kèm tồn lũy kế (SL + giá trị) sau dòng đó.
export interface ItemLedgerRowDto {
  voucherId: string
  voucherKind: 'RECEIPT' | 'ISSUE' // phiếu nhập kho hay phiếu xuất kho — FE dựng link drill-down
  postingDate: string // Ngày hạch toán
  voucherDate: string // Ngày chứng từ
  voucherNo: string
  description: string | null
  counterAccount: string // TK đối ứng ('' với dữ liệu thiếu định khoản)
  unitPrice: string
  inQty: string // '0' nếu là dòng xuất
  inAmount: string
  outQty: string // '0' nếu là dòng nhập
  outAmount: string
  balanceQty: string // Tồn lũy kế (BE tính bằng Decimal)
  balanceAmount: string
}

export interface ItemLedgerReportDto {
  fromDate: string
  toDate: string
  itemCode: string
  itemName: string | null
  unit: string | null
  openingQty: string
  openingAmount: string
  totalInQty: string
  totalInAmount: string
  totalOutQty: string
  totalOutAmount: string
  closingQty: string
  closingAmount: string
  rows: ItemLedgerRowDto[]
}
