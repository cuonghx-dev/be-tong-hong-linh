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

// Số phiếu nhập kế tiếp (preview trên form tạo mới — số thật cấp lúc Cất).
// Key nằm dưới inventoryKeys.all nên tự refetch sau khi create invalidate.
// Dãy số nhập kho chạy toàn cục (không theo năm) → không cần tham số ngày.
export function useNextReceiptNo(enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.receiptNextNo(),
    queryFn: () =>
      api.get<{ voucherNo: string }>('/inventory/receipts/next-no').then((r) => r.data.voucherNo),
    enabled,
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
