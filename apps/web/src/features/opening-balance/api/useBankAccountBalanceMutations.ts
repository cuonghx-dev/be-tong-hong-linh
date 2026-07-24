import type {
  BankAccountOpeningBalanceListDto,
  SaveBankAccountOpeningBalancesInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'
import type { ImportResult } from './useAccountBalanceMutations'

// Lưu số dư tiền gửi của 1 TK (thay thế dữ liệu cũ). Ảnh hưởng cả số dư TK tiền gửi tổng.
export function useSaveBankAccountBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SaveBankAccountOpeningBalancesInput) =>
      api
        .put<BankAccountOpeningBalanceListDto>('/opening-balance/bank-accounts', dto)
        .then((r) => r.data),
    onSuccess: () => {
      // 1 lần lưu tiền gửi đổi cả số dư TK tổng → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}

// Nhập khẩu số dư tiền gửi của 1 TK từ file Excel (bỏ qua TK ngân hàng đã có số dư).
export function useImportBankAccountBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountCode, file }: { accountCode: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>(
          `/opening-balance/bank-accounts/import?accountCode=${encodeURIComponent(accountCode)}`,
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
