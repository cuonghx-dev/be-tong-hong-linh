import type {
  FixedAssetOpeningBalanceDto,
  SaveFixedAssetOpeningBalancesInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'
import type { ImportResult } from './useAccountBalanceMutations'

// Lưu cả danh sách TSCĐ đầu kỳ (thay thế dữ liệu cũ). Ảnh hưởng số dư TK 211x/214x.
export function useSaveFixedAssetBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SaveFixedAssetOpeningBalancesInput) =>
      api
        .put<FixedAssetOpeningBalanceDto[]>('/opening-balance/fixed-assets', dto)
        .then((r) => r.data),
    onSuccess: () => {
      // 1 lần lưu TSCĐ đổi cả số dư TK nguyên giá/khấu hao → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}

export function useImportFixedAssetBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/opening-balance/fixed-assets/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}
