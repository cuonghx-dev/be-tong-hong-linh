import type {
  CreatePurchaseVoucherInput,
  PurchaseVoucherDto,
  UpdatePurchaseVoucherInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { cashKeys } from '@/features/cash'
import { purchaseKeys } from './keys'

export function useCreatePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePurchaseVoucherInput) =>
      api.post<PurchaseVoucherDto>('/purchase/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ mua hàng ảnh hưởng công nợ + tồn kho → invalidate toàn phân hệ.
      // Trả ngay TM sinh phiếu chi (PC) → invalidate cả Tiền mặt.
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportPurchaseVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/purchase/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
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
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi (đổi cờ posted — đảo lại được).
export function useSetPurchaseVoucherPosted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<PurchaseVoucherDto>(`/purchase/vouchers/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

export function useDeletePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/purchase/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}
