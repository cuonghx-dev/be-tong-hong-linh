import type { Paginated, SupplierPayableDto, SupplierPayableFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

// Công nợ phải trả theo nhà cung cấp (tổng hợp, tab Đối chiếu công nợ).
export function usePayables(filter: SupplierPayableFilter) {
  return useQuery({
    queryKey: purchaseKeys.payables(filter),
    queryFn: () =>
      api
        .get<Paginated<SupplierPayableDto>>('/purchase/payables', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}
