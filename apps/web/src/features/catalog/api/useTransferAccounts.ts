import type { Paginated, TransferAccountDto, TransferAccountFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách tài khoản kết chuyển (lọc + phân trang).
export function useTransferAccounts(filter: TransferAccountFilter) {
  return useQuery({
    queryKey: catalogKeys.transferAccounts(filter),
    queryFn: () =>
      api
        .get<Paginated<TransferAccountDto>>('/catalog/transfer-accounts', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 tài khoản kết chuyển.
export function useTransferAccount(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.transferAccount(id ?? ''),
    queryFn: () =>
      api.get<TransferAccountDto>(`/catalog/transfer-accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
