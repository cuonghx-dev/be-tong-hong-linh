import type { InventoryItemDto, InventoryItemFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

// Danh sách hàng hóa - dịch vụ (lọc + phân trang).
export function useItems(filter: InventoryItemFilter) {
  return useQuery({
    queryKey: purchaseKeys.items(filter),
    queryFn: () =>
      api.get<Paginated<InventoryItemDto>>('/purchase/items', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 hàng hóa - dịch vụ.
export function useItem(id: string | null) {
  return useQuery({
    queryKey: purchaseKeys.item(id ?? ''),
    queryFn: () => api.get<InventoryItemDto>(`/purchase/items/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
