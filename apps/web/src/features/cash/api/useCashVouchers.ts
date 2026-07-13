import type { CashVoucherDto, CashVoucherFilter, CashVoucherType, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { cashKeys } from './keys'

// Danh sách phiếu thu/chi (lọc + phân trang).
export function useCashVouchers(filter: CashVoucherFilter) {
  return useQuery({
    queryKey: cashKeys.vouchers(filter),
    queryFn: () =>
      api
        .get<Paginated<CashVoucherDto>>('/cash/vouchers', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Số phiếu kế tiếp (preview hiển thị trên form tạo mới — số thật cấp lúc Cất).
// Nằm dưới cashKeys.all nên tự refetch sau khi create invalidate (vd "Cất và Thêm").
export function useNextCashVoucherNo(type: CashVoucherType, voucherDate: string, enabled = true) {
  return useQuery({
    queryKey: cashKeys.nextNo(type, voucherDate),
    queryFn: () =>
      api
        .get<{ voucherNo: string }>('/cash/vouchers/next-no', { params: { type, voucherDate } })
        .then((r) => r.data.voucherNo),
    enabled,
  })
}

// Chi tiết 1 phiếu (dùng khi mở sửa).
export function useCashVoucher(id: string | null) {
  return useQuery({
    queryKey: cashKeys.voucher(id ?? ''),
    queryFn: () => api.get<CashVoucherDto>(`/cash/vouchers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
