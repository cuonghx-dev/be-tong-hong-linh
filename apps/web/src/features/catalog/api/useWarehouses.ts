import type { Paginated, WarehouseDto, WarehouseFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách kho (lọc + phân trang).
export function useWarehouses(filter: WarehouseFilter) {
  return useQuery({
    queryKey: catalogKeys.warehouses(filter),
    queryFn: () =>
      api.get<Paginated<WarehouseDto>>('/catalog/warehouses', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 kho.
export function useWarehouse(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.warehouse(id ?? ''),
    queryFn: () => api.get<WarehouseDto>(`/catalog/warehouses/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
