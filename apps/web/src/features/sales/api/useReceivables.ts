import type { CustomerReceivableDto, CustomerReceivableFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

// Công nợ phải thu theo khách hàng (tổng hợp).
export function useReceivables(filter: CustomerReceivableFilter) {
  return useQuery({
    queryKey: salesKeys.receivables(filter),
    queryFn: () =>
      api
        .get<Paginated<CustomerReceivableDto>>('/sales/receivables', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}
