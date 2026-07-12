import type {
  BankBalanceFilter,
  BankBalanceReportDto,
  BankBookReportDto,
  BankReportFilter,
  DailyBalanceReportDto,
} from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { bankKeys } from './keys'

// Hook chung gọi 1 báo cáo tiền gửi theo slug (/bank/reports/<slug>).
function useBankReport<T>(slug: string, filter: BankReportFilter | BankBalanceFilter) {
  return useQuery({
    queryKey: bankKeys.report(slug, filter),
    queryFn: () => api.get<T>(`/bank/reports/${slug}`, { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Sổ tiền gửi ngân hàng (group theo từng TK ngân hàng).
export function useBankBook(filter: BankReportFilter) {
  return useBankReport<BankBookReportDto>('bank-book', filter)
}

// Bảng kê số dư ngân hàng tại 1 thời điểm.
export function useBankBalances(filter: BankBalanceFilter) {
  return useBankReport<BankBalanceReportDto>('account-balances', filter)
}

// Bảng kê số dư tiền theo ngày (tiền gửi).
export function useBankDailyBalance(filter: BankReportFilter) {
  return useBankReport<DailyBalanceReportDto>('daily-balance', filter)
}
