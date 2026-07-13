import type {
  Paginated,
  PurchaseVoucherDto,
  PurchaseVoucherFilter,
  PurchaseVoucherType,
} from '@app/shared'
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

// Số chứng từ kế tiếp (preview trên form tạo mới — số thật cấp lúc Cất).
// Key nằm dưới purchaseKeys.all nên tự refetch sau khi create invalidate.
export function useNextPurchaseVoucherNo(
  type: PurchaseVoucherType,
  voucherDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseKeys.nextNo(type, voucherDate),
    queryFn: () =>
      api
        .get<{ voucherNo: string }>('/purchase/vouchers/next-no', { params: { type, voucherDate } })
        .then((r) => r.data.voucherNo),
    enabled,
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
