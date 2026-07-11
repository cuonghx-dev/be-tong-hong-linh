import type {
  CreateVoucherTypeInput,
  UpdateVoucherTypeInput,
  VoucherTypeDto,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateVoucherType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateVoucherTypeInput) =>
      api.post<VoucherTypeDto>('/catalog/voucher-types', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface VoucherTypeImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportVoucherTypes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<VoucherTypeImportResult>('/catalog/voucher-types/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateVoucherType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateVoucherTypeInput }) =>
      api.patch<VoucherTypeDto>(`/catalog/voucher-types/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteVoucherType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/voucher-types/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
