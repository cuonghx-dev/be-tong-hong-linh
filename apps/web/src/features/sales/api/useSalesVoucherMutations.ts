import type {
  CreateSalesVoucherInput,
  SalesVoucherDto,
  UpdateSalesVoucherInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

export function useCreateSalesVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSalesVoucherInput) =>
      api.post<SalesVoucherDto>('/sales/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ ảnh hưởng doanh thu + công nợ + hóa đơn → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: salesKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportSalesVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/sales/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
    },
  })
}

export function useUpdateSalesVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSalesVoucherInput }) =>
      api.patch<SalesVoucherDto>(`/sales/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi (đổi cờ posted — đảo lại được).
export function useSetSalesVoucherPosted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<SalesVoucherDto>(`/sales/vouchers/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
    },
  })
}

export function useDeleteSalesVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sales/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
    },
  })
}
