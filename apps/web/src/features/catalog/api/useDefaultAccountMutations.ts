import type {
  CreateDefaultAccountInput,
  DefaultAccountDto,
  UpdateDefaultAccountInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateDefaultAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateDefaultAccountInput) =>
      api.post<DefaultAccountDto>('/catalog/default-accounts', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface DefaultAccountImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportDefaultAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<DefaultAccountImportResult>('/catalog/default-accounts/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateDefaultAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDefaultAccountInput }) =>
      api.patch<DefaultAccountDto>(`/catalog/default-accounts/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteDefaultAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/default-accounts/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
