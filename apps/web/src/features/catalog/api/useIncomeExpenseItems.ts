import type { IncomeExpenseItemDto, IncomeExpenseItemFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách mục thu/chi (lọc + phân trang).
export function useIncomeExpenseItems(filter: IncomeExpenseItemFilter) {
  return useQuery({
    queryKey: catalogKeys.incomeExpenseItems(filter),
    queryFn: () =>
      api
        .get<Paginated<IncomeExpenseItemDto>>('/catalog/income-expense-items', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 mục thu/chi.
export function useIncomeExpenseItem(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.incomeExpenseItem(id ?? ''),
    queryFn: () =>
      api.get<IncomeExpenseItemDto>(`/catalog/income-expense-items/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
