import type { BankAccountDto, CreateBankAccountInput, UpdateBankAccountInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm tài khoản ngân hàng' },
    mutationFn: (dto: CreateBankAccountInput) =>
      api.post<BankAccountDto>('/catalog/bank-accounts', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface BankAccountImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportBankAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<BankAccountImportResult>('/catalog/bank-accounts/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật tài khoản ngân hàng' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBankAccountInput }) =>
      api.patch<BankAccountDto>(`/catalog/bank-accounts/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa tài khoản ngân hàng', error: 'Xóa tài khoản ngân hàng thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/bank-accounts/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
