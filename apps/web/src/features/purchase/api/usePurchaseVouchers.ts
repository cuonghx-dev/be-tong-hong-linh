import type { Paginated, PurchaseVoucherDto, PurchaseVoucherFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

// Danh sách chứng từ mua hàng (lọc + phân trang).
export function usePurchaseVouchers(filter: PurchaseVoucherFilter) {
  return useQuery({
    queryKey: purchaseKeys.vouchers(filter),
    queryFn: () =>
      api
        .get<Paginated<PurchaseVoucherDto>>('/purchase/vouchers', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 chứng từ (dùng khi mở sửa).
export function usePurchaseVoucher(id: string | null) {
  return useQuery({
    queryKey: purchaseKeys.voucher(id ?? ''),
    queryFn: () => api.get<PurchaseVoucherDto>(`/purchase/vouchers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
