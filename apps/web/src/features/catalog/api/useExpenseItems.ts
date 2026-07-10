import type { ExpenseItemDto, ExpenseItemFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách khoản mục chi phí (lọc + phân trang).
export function useExpenseItems(filter: ExpenseItemFilter) {
  return useQuery({
    queryKey: catalogKeys.expenseItems(filter),
    queryFn: () =>
      api
        .get<Paginated<ExpenseItemDto>>('/catalog/expense-items', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 khoản mục chi phí.
export function useExpenseItem(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.expenseItem(id ?? ''),
    queryFn: () => api.get<ExpenseItemDto>(`/catalog/expense-items/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
