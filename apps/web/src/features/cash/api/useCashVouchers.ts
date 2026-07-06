import type { CashVoucherDto, CashVoucherFilter, Paginated } from '@app/shared'
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

// Chi tiết 1 phiếu (dùng khi mở sửa).
export function useCashVoucher(id: string | null) {
  return useQuery({
    queryKey: cashKeys.voucher(id ?? ''),
    queryFn: () => api.get<CashVoucherDto>(`/cash/vouchers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
