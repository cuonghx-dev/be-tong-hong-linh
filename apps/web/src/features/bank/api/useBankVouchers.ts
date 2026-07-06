import type { BankVoucherDto, BankVoucherFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { bankKeys } from './keys'

// Danh sách chứng từ thu/chi tiền gửi (lọc + phân trang).
export function useBankVouchers(filter: BankVoucherFilter) {
  return useQuery({
    queryKey: bankKeys.vouchers(filter),
    queryFn: () =>
      api
        .get<Paginated<BankVoucherDto>>('/bank/vouchers', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 chứng từ (dùng khi mở sửa).
export function useBankVoucher(id: string | null) {
  return useQuery({
    queryKey: bankKeys.voucher(id ?? ''),
    queryFn: () => api.get<BankVoucherDto>(`/bank/vouchers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
