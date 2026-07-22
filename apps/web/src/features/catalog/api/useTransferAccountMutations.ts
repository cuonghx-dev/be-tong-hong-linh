import type {
  CreateTransferAccountInput,
  TransferAccountDto,
  UpdateTransferAccountInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateTransferAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm tài khoản kết chuyển' },
    mutationFn: (dto: CreateTransferAccountInput) =>
      api.post<TransferAccountDto>('/catalog/transfer-accounts', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface TransferAccountImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportTransferAccounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<TransferAccountImportResult>('/catalog/transfer-accounts/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateTransferAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật tài khoản kết chuyển' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTransferAccountInput }) =>
      api.patch<TransferAccountDto>(`/catalog/transfer-accounts/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteTransferAccount() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa tài khoản kết chuyển', error: 'Xóa tài khoản kết chuyển thất bại' },
    mutationFn: (id: string) =>
      api.delete(`/catalog/transfer-accounts/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
