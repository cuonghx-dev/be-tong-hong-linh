import type {
  CashBookReportDto,
  CashJournalReportDto,
  CashReportFilter,
  DailyBalanceReportDto,
} from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { cashKeys } from './keys'

// Hook chung gọi 1 báo cáo tiền mặt theo slug (/cash/reports/<slug>).
function useCashReport<T>(slug: string, filter: CashReportFilter) {
  return useQuery({
    queryKey: cashKeys.report(slug, filter),
    queryFn: () => api.get<T>(`/cash/reports/${slug}`, { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Sổ nhật ký thu tiền (S03a1-DNN) / chi tiền (S03a2-DNN) — cùng cấu trúc dữ liệu.
export function useCashJournal(kind: 'receipt' | 'payment', filter: CashReportFilter) {
  return useCashReport<CashJournalReportDto>(
    kind === 'receipt' ? 'receipt-journal' : 'payment-journal',
    filter,
  )
}

// Sổ kế toán chi tiết quỹ tiền mặt.
export function useCashBook(filter: CashReportFilter) {
  return useCashReport<CashBookReportDto>('cash-book', filter)
}

// Bảng kê số dư tiền theo ngày.
export function useDailyBalance(filter: CashReportFilter) {
  return useCashReport<DailyBalanceReportDto>('daily-balance', filter)
}
