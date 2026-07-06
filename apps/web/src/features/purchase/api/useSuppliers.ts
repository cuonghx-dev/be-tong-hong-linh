import type { Paginated, SupplierDto, SupplierFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

// Danh sách nhà cung cấp (lọc + phân trang).
export function useSuppliers(filter: SupplierFilter) {
  return useQuery({
    queryKey: purchaseKeys.suppliers(filter),
    queryFn: () =>
      api.get<Paginated<SupplierDto>>('/purchase/suppliers', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 nhà cung cấp.
export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: purchaseKeys.supplier(id ?? ''),
    queryFn: () => api.get<SupplierDto>(`/purchase/suppliers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
