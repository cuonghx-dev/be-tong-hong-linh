import type { PartnerOpeningBalanceListDto, SavePartnerOpeningBalancesInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'
import type { ImportResult } from './useAccountBalanceMutations'

// Lưu số dư công nợ của 1 TK (thay thế dữ liệu cũ). Ảnh hưởng cả số dư TK công nợ tổng.
export function useSavePartnerBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SavePartnerOpeningBalancesInput) =>
      api
        .put<PartnerOpeningBalanceListDto>('/opening-balance/partners', dto)
        .then((r) => r.data),
    onSuccess: () => {
      // 1 lần lưu công nợ đổi cả số dư TK tổng → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}

// Nhập khẩu số dư công nợ của 1 TK từ file Excel MISA (bỏ qua đối tượng đã có số dư).
export function useImportPartnerBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountCode, file }: { accountCode: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>(
          `/opening-balance/partners/import?accountCode=${encodeURIComponent(accountCode)}`,
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}
