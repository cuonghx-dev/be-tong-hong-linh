import type { InventoryReceiptDto, InventoryReceiptFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'

// Danh sách phiếu nhập kho (lọc + phân trang).
export function useReceipts(filter: InventoryReceiptFilter) {
  return useQuery({
    queryKey: inventoryKeys.receipts(filter),
    queryFn: () =>
      api
        .get<Paginated<InventoryReceiptDto>>('/inventory/receipts', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 phiếu (dùng khi mở xem/sửa).
export function useReceipt(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.receipt(id ?? ''),
    queryFn: () => api.get<InventoryReceiptDto>(`/inventory/receipts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
