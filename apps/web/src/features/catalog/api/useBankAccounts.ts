import type { BankAccountDto, BankAccountFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách tài khoản ngân hàng (lọc + phân trang).
export function useBankAccounts(filter: BankAccountFilter) {
  return useQuery({
    queryKey: catalogKeys.bankAccounts(filter),
    queryFn: () =>
      api
        .get<Paginated<BankAccountDto>>('/catalog/bank-accounts', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 tài khoản ngân hàng.
export function useBankAccount(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.bankAccount(id ?? ''),
    queryFn: () => api.get<BankAccountDto>(`/catalog/bank-accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
