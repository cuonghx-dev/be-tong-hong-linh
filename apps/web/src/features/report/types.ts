// Danh mục báo cáo tab "Báo cáo" phân hệ Tổng hợp — nhóm accordion như MISA,
// chỉ liệt kê báo cáo đã build (gồm cả báo cáo các phân hệ khác, link chéo theo route).

export type GeneralReportSlug = 'general-journal' | 'account-ledger'

// Báo cáo thuộc phân hệ Tổng hợp (route /general/reports/<slug>).
export const GENERAL_REPORTS: { slug: GeneralReportSlug; name: string }[] = [
  { slug: 'general-journal', name: 'S03a-DNN: Sổ nhật ký chung' },
  { slug: 'account-ledger', name: 'S03b-DNN: Sổ chi tiết các tài khoản' },
]

export interface ReportCatalogItem {
  name: string
  path: string // route trang xem full-page (có thể thuộc phân hệ khác)
}

export interface ReportCatalogGroup {
  title: string
  reports: ReportCatalogItem[]
}

export const GENERAL_REPORT_GROUPS: ReportCatalogGroup[] = [
  {
    title: 'Sổ sách kế toán',
    reports: [
      { name: 'S03a-DNN: Sổ nhật ký chung', path: '/general/reports/general-journal' },
      { name: 'S03b-DNN: Sổ chi tiết các tài khoản', path: '/general/reports/account-ledger' },
      { name: 'S03a1-DNN: Sổ nhật ký thu tiền', path: '/cash/reports/receipt-journal' },
      { name: 'S03a2-DNN: Sổ nhật ký chi tiền', path: '/cash/reports/payment-journal' },
      { name: 'Sổ kế toán chi tiết quỹ tiền mặt', path: '/cash/reports/cash-book' },
      { name: 'Sổ tiền gửi ngân hàng', path: '/bank/reports/bank-book' },
      { name: 'Sổ chi tiết bán hàng', path: '/sales/reports/detail' },
      { name: 'Sổ chi tiết mua hàng', path: '/purchase/reports/detail' },
      { name: 'Sổ chi tiết vật tư hàng hóa', path: '/inventory/reports/item-ledger' },
    ],
  },
  {
    title: 'Báo cáo công nợ',
    reports: [
      { name: 'Tổng hợp công nợ phải thu khách hàng', path: '/sales/reports/receivable-summary' },
      { name: 'Chi tiết công nợ phải thu khách hàng', path: '/sales/reports/receivable-detail' },
      { name: 'Tổng hợp công nợ phải trả nhà cung cấp', path: '/purchase/reports/payable-summary' },
      { name: 'Chi tiết công nợ phải trả nhà cung cấp', path: '/purchase/reports/payable-detail' },
    ],
  },
  {
    title: 'Báo cáo tổng hợp',
    reports: [
      { name: 'Bảng kê số dư tiền theo ngày', path: '/cash/reports/daily-balance' },
      { name: 'Bảng kê số dư ngân hàng', path: '/bank/reports/account-balances' },
      { name: 'Tổng hợp bán hàng theo mặt hàng', path: '/sales/reports/by-item' },
      { name: 'Tổng hợp mua hàng theo mặt hàng', path: '/purchase/reports/by-item' },
      { name: 'Tổng hợp tồn kho', path: '/inventory/reports/stock-summary' },
    ],
  },
]
