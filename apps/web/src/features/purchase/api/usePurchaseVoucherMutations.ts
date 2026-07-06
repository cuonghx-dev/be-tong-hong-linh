import type {
  CreatePurchaseVoucherInput,
  PurchaseVoucherDto,
  UpdatePurchaseVoucherInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

export function useCreatePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePurchaseVoucherInput) =>
      api.post<PurchaseVoucherDto>('/purchase/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ mua hàng ảnh hưởng công nợ + tồn kho → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
    },
  })
}

export function useUpdatePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePurchaseVoucherInput }) =>
      api.patch<PurchaseVoucherDto>(`/purchase/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
    },
  })
}

export function useDeletePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/purchase/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
    },
  })
}
