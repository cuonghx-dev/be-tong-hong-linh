import type { Paginated, SalesVoucherDto, SalesVoucherFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

// Danh sách chứng từ bán hàng (lọc + phân trang).
export function useSalesVouchers(filter: SalesVoucherFilter) {
  return useQuery({
    queryKey: salesKeys.vouchers(filter),
    queryFn: () =>
      api.get<Paginated<SalesVoucherDto>>('/sales/vouchers', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 chứng từ (dùng khi mở sửa).
export function useSalesVoucher(id: string | null) {
  return useQuery({
    queryKey: salesKeys.voucher(id ?? ''),
    queryFn: () => api.get<SalesVoucherDto>(`/sales/vouchers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
