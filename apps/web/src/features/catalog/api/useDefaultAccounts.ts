import type { DefaultAccountDto, DefaultAccountFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách tài khoản ngầm định (lọc + phân trang).
export function useDefaultAccounts(filter: DefaultAccountFilter) {
  return useQuery({
    queryKey: catalogKeys.defaultAccounts(filter),
    queryFn: () =>
      api
        .get<Paginated<DefaultAccountDto>>('/catalog/default-accounts', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 tài khoản ngầm định.
export function useDefaultAccount(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.defaultAccount(id ?? ''),
    queryFn: () =>
      api.get<DefaultAccountDto>(`/catalog/default-accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
