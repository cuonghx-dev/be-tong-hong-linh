import type { CashVoucherDto, CreateCashVoucherInput, UpdateCashVoucherInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { cashKeys } from './keys'

export function useCreateCashVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCashVoucherInput) =>
      api.post<CashVoucherDto>('/cash/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Phiếu quỹ ảnh hưởng sổ quỹ + công nợ → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

export function useUpdateCashVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCashVoucherInput }) =>
      api.patch<CashVoucherDto>(`/cash/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportCashVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/cash/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi phiếu — ảnh hưởng sổ quỹ + báo cáo → invalidate toàn phân hệ.
export function useSetCashVoucherPosted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<CashVoucherDto>(`/cash/vouchers/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}

export function useDeleteCashVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cash/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashKeys.all })
    },
  })
}
