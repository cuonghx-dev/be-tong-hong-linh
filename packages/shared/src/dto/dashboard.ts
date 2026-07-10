// Type response phân hệ Tổng quan (dashboard) — dùng chung FE ↔ BE.
// Mọi số tiền là Decimal serialize thành string (đồng, không float).

// Kỳ thống kê của widget Tình hình tài chính.
export type DashboardPeriod = 'month' | 'quarter' | 'year'

// Tình hình tài chính: số dư hiện tại + phát sinh trong kỳ.
export interface FinanceOverviewDto {
  cash: string // Tồn quỹ tiền mặt (TK 111) — số dư đến hiện tại
  bank: string // Tiền gửi ngân hàng (TK 112) — số dư đến hiện tại
  receivable: string // Công nợ phải thu (chứng từ bán hàng chưa thu)
  payable: string // Công nợ phải trả (chứng từ mua hàng chưa trả)
  inventory: string // Giá trị hàng tồn kho (nhập − xuất)
  revenue: string // Doanh thu trong kỳ (chưa gồm VAT)
  expense: string // Chi phí trong kỳ (phát sinh Nợ TK 6xx/8xx)
  profit: string // Lợi nhuận = doanh thu − chi phí
}

// Nợ phải thu / phải trả theo hạn.
export interface DebtAgingDto {
  total: string
  overdue: string // Quá hạn (hạn thanh toán < hôm nay)
  current: string // Trong hạn
}

// Doanh thu, chi phí, lợi nhuận theo tháng (năm dương lịch).
export interface MonthlyProfitLossDto {
  month: number // 1..12
  revenue: string
  expense: string
  profit: string
}

export interface ProfitLossReportDto {
  year: number
  totalRevenue: string
  totalExpense: string
  totalProfit: string
  months: MonthlyProfitLossDto[]
}

// Dòng tiền thu/chi/tồn theo tháng (tiền mặt + tiền gửi).
export interface MonthlyCashflowDto {
  month: number // 1..12
  inflow: string // Tổng thu trong tháng
  outflow: string // Tổng chi trong tháng
  balance: string // Tồn cuối tháng (lũy kế từ đầu)
}

export interface CashflowReportDto {
  year: number
  totalInflow: string
  totalOutflow: string
  balance: string // Tồn hiện tại
  months: MonthlyCashflowDto[]
}

// Hàng hóa tồn kho — top mặt hàng theo giá trị tồn.
export interface TopInventoryItemDto {
  itemName: string
  quantity: string
  value: string
}

export interface InventorySummaryDto {
  totalValue: string
  items: TopInventoryItemDto[]
}

// Mặt hàng bán chạy — top theo doanh thu trong năm.
export interface TopSellingItemDto {
  itemName: string
  quantity: string
  revenue: string
}

export interface TopSellingReportDto {
  year: number
  totalRevenue: string
  items: TopSellingItemDto[]
}

// Cơ cấu chi phí theo nhóm TK trong năm.
export interface ExpenseGroupDto {
  key: string // nhóm TK: 'production' | 'cogs' | 'selling' | 'admin' | 'finance' | 'other'
  label: string // tên hiển thị tiếng Việt
  amount: string
}

export interface ExpenseBreakdownDto {
  year: number
  total: string
  groups: ExpenseGroupDto[]
}
