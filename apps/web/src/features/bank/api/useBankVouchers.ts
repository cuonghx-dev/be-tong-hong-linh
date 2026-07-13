import type { BankVoucherDto, BankVoucherFilter, BankVoucherType, Paginated } from '@app/shared'
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

// Số chứng từ kế tiếp (preview trên form tạo mới — số thật cấp lúc Cất).
// Key nằm dưới bankKeys.all nên tự refetch sau khi create invalidate.
export function useNextBankVoucherNo(type: BankVoucherType, voucherDate: string, enabled = true) {
  return useQuery({
    queryKey: bankKeys.nextNo(type, voucherDate),
    queryFn: () =>
      api
        .get<{ voucherNo: string }>('/bank/vouchers/next-no', { params: { type, voucherDate } })
        .then((r) => r.data.voucherNo),
    enabled,
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
