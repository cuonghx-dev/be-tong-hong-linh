import type { Paginated, ProductionOrderDto, ProductionOrderFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'

// Danh sách lệnh sản xuất (lọc + phân trang).
export function useProductionOrders(filter: ProductionOrderFilter) {
  return useQuery({
    queryKey: inventoryKeys.productionOrders(filter),
    queryFn: () =>
      api
        .get<Paginated<ProductionOrderDto>>('/inventory/production-orders', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 lệnh sản xuất (dùng khi mở xem/sửa).
export function useProductionOrder(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.productionOrder(id ?? ''),
    queryFn: () =>
      api.get<ProductionOrderDto>(`/inventory/production-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
