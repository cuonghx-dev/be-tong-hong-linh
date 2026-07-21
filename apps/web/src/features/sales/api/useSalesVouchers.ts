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

// Số chứng từ kế tiếp (preview trên form tạo mới — số thật cấp lúc Lưu).
// Key nằm dưới salesKeys.all nên tự refetch sau khi create invalidate.
// Số đổi theo tùy chọn thanh toán: thu ngay TM → PT, thu ngay CK → NTTK, chưa thu → BH.
export function useNextSalesVoucherNo(
  voucherDate: string,
  paymentMode: string,
  paymentMethod: string,
  enabled = true,
) {
  return useQuery({
    queryKey: salesKeys.nextNo(voucherDate, paymentMode, paymentMethod),
    queryFn: () =>
      api
        .get<{ voucherNo: string }>('/sales/vouchers/next-no', {
          params: { voucherDate, paymentMode, paymentMethod },
        })
        .then((r) => r.data.voucherNo),
    enabled,
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
