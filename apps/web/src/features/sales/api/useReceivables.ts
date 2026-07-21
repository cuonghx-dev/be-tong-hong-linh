import type {
  CollectPaymentInput,
  CollectPaymentResultDto,
  CustomerReceivableDto,
  CustomerReceivableFilter,
  OpenReceivableVoucherDto,
  Paginated,
} from '@app/shared'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { bankKeys } from '@/features/bank'
import { cashKeys } from '@/features/cash'
import { salesKeys } from './keys'

// Công nợ phải thu theo khách hàng (tổng hợp).
export function useReceivables(filter: CustomerReceivableFilter) {
  return useQuery({
    queryKey: salesKeys.receivables(filter),
    queryFn: () =>
      api
        .get<Paginated<CustomerReceivableDto>>('/sales/receivables', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chứng từ bán hàng còn phải thu của 1 KH (chọn đối trừ trong form thu tiền).
export function useOpenReceivables(customerId: string | undefined) {
  return useQuery({
    queryKey: salesKeys.openReceivables(customerId ?? ''),
    queryFn: () =>
      api
        .get<OpenReceivableVoucherDto[]>('/sales/receivables/open-vouchers', {
          params: { customerId },
        })
        .then((r) => r.data),
    enabled: !!customerId,
  })
}

// Thu tiền khách hàng theo hóa đơn: sinh phiếu thu / thu tiền gửi + đối trừ.
export function useCollectPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CollectPaymentInput) =>
      api.post<CollectPaymentResultDto>('/sales/receivables/collect', dto).then((r) => r.data),
    onSuccess: () => {
      // Đối trừ đổi TT thanh toán + công nợ; phiếu thu/thu tiền gửi mới → Tiền mặt/Tiền gửi.
      qc.invalidateQueries({ queryKey: salesKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
    },
  })
}
