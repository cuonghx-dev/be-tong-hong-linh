import type { CustomerDto, CustomerFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

// Danh sách khách hàng (lọc + phân trang).
export function useCustomers(filter: CustomerFilter) {
  return useQuery({
    queryKey: salesKeys.customers(filter),
    queryFn: () =>
      api.get<Paginated<CustomerDto>>('/sales/customers', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 khách hàng.
export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: salesKeys.customer(id ?? ''),
    queryFn: () => api.get<CustomerDto>(`/sales/customers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
