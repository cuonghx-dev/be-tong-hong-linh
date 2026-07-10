import type { AccountOpeningBalanceDto, SaveAccountOpeningBalancesInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

// Lưu cả bảng số dư tài khoản (thay thế dữ liệu cũ).
export function useSaveAccountBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SaveAccountOpeningBalancesInput) =>
      api.put<AccountOpeningBalanceDto[]>('/opening-balance/accounts', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportAccountBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/opening-balance/accounts/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}
