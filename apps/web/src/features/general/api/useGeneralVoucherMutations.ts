import type {
  CreateGeneralVoucherInput,
  GeneralVoucherDto,
  UpdateGeneralVoucherInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { generalKeys } from './keys'

export function useCreateGeneralVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateGeneralVoucherInput) =>
      api.post<GeneralVoucherDto>('/general/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ NVK ảnh hưởng sổ cái nhiều TK → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: generalKeys.all })
    },
  })
}

export function useUpdateGeneralVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateGeneralVoucherInput }) =>
      api.patch<GeneralVoucherDto>(`/general/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: generalKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportGeneralVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/general/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: generalKeys.all })
    },
  })
}

export function useDeleteGeneralVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/general/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: generalKeys.all })
    },
  })
}
