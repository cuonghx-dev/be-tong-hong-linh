import type { BankDto, CreateBankInput, UpdateBankInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateBankInput) =>
      api.post<BankDto>('/catalog/banks', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface BankImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportBanks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<BankImportResult>('/catalog/banks/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBankInput }) =>
      api.patch<BankDto>(`/catalog/banks/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/banks/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
