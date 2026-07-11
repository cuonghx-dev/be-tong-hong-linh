import type { Paginated, VoucherTypeDto, VoucherTypeFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách loại chứng từ (lọc + phân trang).
export function useVoucherTypes(filter: VoucherTypeFilter) {
  return useQuery({
    queryKey: catalogKeys.voucherTypes(filter),
    queryFn: () =>
      api
        .get<Paginated<VoucherTypeDto>>('/catalog/voucher-types', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 loại chứng từ.
export function useVoucherType(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.voucherType(id ?? ''),
    queryFn: () => api.get<VoucherTypeDto>(`/catalog/voucher-types/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
