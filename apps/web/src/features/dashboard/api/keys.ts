import type { DashboardPeriod } from '@app/shared'

// Query keys phân hệ Tổng quan.
export const dashboardKeys = {
  all: ['dashboard'] as const,
  finance: (period: DashboardPeriod) => [...dashboardKeys.all, 'finance', period] as const,
  receivableAging: () => [...dashboardKeys.all, 'receivable-aging'] as const,
  payableAging: () => [...dashboardKeys.all, 'payable-aging'] as const,
  profitLoss: (year: number) => [...dashboardKeys.all, 'profit-loss', year] as const,
  cashflow: (year: number) => [...dashboardKeys.all, 'cashflow', year] as const,
  inventory: () => [...dashboardKeys.all, 'inventory'] as const,
  topSelling: (year: number) => [...dashboardKeys.all, 'top-selling', year] as const,
  expenses: (year: number) => [...dashboardKeys.all, 'expenses', year] as const,
}
