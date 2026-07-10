import type {
  CashflowReportDto,
  DashboardPeriod,
  DebtAgingDto,
  ExpenseBreakdownDto,
  FinanceOverviewDto,
  InventorySummaryDto,
  ProfitLossReportDto,
  TopSellingReportDto,
} from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { dashboardKeys } from './keys'

// Hooks đọc số liệu Tổng quan — mỗi widget 1 query để "Tải lại" độc lập.

export function useFinanceOverview(period: DashboardPeriod) {
  return useQuery({
    queryKey: dashboardKeys.finance(period),
    queryFn: () =>
      api.get<FinanceOverviewDto>('/dashboard/finance', { params: { period } }).then((r) => r.data),
  })
}

export function useReceivableAging() {
  return useQuery({
    queryKey: dashboardKeys.receivableAging(),
    queryFn: () => api.get<DebtAgingDto>('/dashboard/receivable-aging').then((r) => r.data),
  })
}

export function usePayableAging() {
  return useQuery({
    queryKey: dashboardKeys.payableAging(),
    queryFn: () => api.get<DebtAgingDto>('/dashboard/payable-aging').then((r) => r.data),
  })
}

export function useProfitLoss(year: number) {
  return useQuery({
    queryKey: dashboardKeys.profitLoss(year),
    queryFn: () =>
      api.get<ProfitLossReportDto>('/dashboard/profit-loss', { params: { year } }).then((r) => r.data),
  })
}

export function useCashflow(year: number) {
  return useQuery({
    queryKey: dashboardKeys.cashflow(year),
    queryFn: () =>
      api.get<CashflowReportDto>('/dashboard/cashflow', { params: { year } }).then((r) => r.data),
  })
}

export function useInventorySummary() {
  return useQuery({
    queryKey: dashboardKeys.inventory(),
    queryFn: () => api.get<InventorySummaryDto>('/dashboard/inventory').then((r) => r.data),
  })
}

export function useTopSelling(year: number) {
  return useQuery({
    queryKey: dashboardKeys.topSelling(year),
    queryFn: () =>
      api.get<TopSellingReportDto>('/dashboard/top-selling', { params: { year } }).then((r) => r.data),
  })
}

export function useExpenseBreakdown(year: number) {
  return useQuery({
    queryKey: dashboardKeys.expenses(year),
    queryFn: () =>
      api.get<ExpenseBreakdownDto>('/dashboard/expenses', { params: { year } }).then((r) => r.data),
  })
}
