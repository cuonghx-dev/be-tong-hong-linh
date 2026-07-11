import type { BankDto, BankFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách ngân hàng (lọc + phân trang).
export function useBanks(filter: BankFilter) {
  return useQuery({
    queryKey: catalogKeys.banks(filter),
    queryFn: () =>
      api.get<Paginated<BankDto>>('/catalog/banks', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 ngân hàng.
export function useBank(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.bank(id ?? ''),
    queryFn: () => api.get<BankDto>(`/catalog/banks/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
