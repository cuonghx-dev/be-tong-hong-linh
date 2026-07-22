import type { AccountDto, CreateAccountInput, UpdateAccountInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm tài khoản' },
    mutationFn: (dto: CreateAccountInput) =>
      api.post<AccountDto>('/catalog/accounts', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface AccountImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<AccountImportResult>('/catalog/accounts/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật tài khoản' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAccountInput }) =>
      api.patch<AccountDto>(`/catalog/accounts/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa tài khoản', error: 'Xóa tài khoản thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/accounts/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
