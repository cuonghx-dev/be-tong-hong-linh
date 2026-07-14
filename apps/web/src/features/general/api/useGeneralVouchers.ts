import type { GeneralVoucherDto, GeneralVoucherFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { generalKeys } from './keys'

// Danh sách chứng từ nghiệp vụ khác (lọc + phân trang).
export function useGeneralVouchers(filter: GeneralVoucherFilter) {
  return useQuery({
    queryKey: generalKeys.vouchers(filter),
    queryFn: () =>
      api
        .get<Paginated<GeneralVoucherDto>>('/general/vouchers', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Số chứng từ kế tiếp (preview trên form tạo mới — số thật cấp lúc Lưu).
// Key nằm dưới generalKeys.all nên tự refetch sau khi create invalidate.
export function useNextGeneralVoucherNo(voucherDate: string, enabled = true) {
  return useQuery({
    queryKey: generalKeys.nextNo(voucherDate),
    queryFn: () =>
      api
        .get<{ voucherNo: string }>('/general/vouchers/next-no', { params: { voucherDate } })
        .then((r) => r.data.voucherNo),
    enabled,
  })
}

// Chi tiết 1 chứng từ (dùng khi mở xem/sửa).
export function useGeneralVoucher(id: string | null) {
  return useQuery({
    queryKey: generalKeys.voucher(id ?? ''),
    queryFn: () => api.get<GeneralVoucherDto>(`/general/vouchers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
