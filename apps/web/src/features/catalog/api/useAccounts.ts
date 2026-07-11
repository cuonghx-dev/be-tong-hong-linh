import type { AccountDto, AccountFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách tài khoản (lọc + phân trang).
export function useAccounts(filter: AccountFilter) {
  return useQuery({
    queryKey: catalogKeys.accounts(filter),
    queryFn: () =>
      api.get<Paginated<AccountDto>>('/catalog/accounts', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 tài khoản.
export function useAccount(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.account(id ?? ''),
    queryFn: () => api.get<AccountDto>(`/catalog/accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
