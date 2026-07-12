import type {
  BankAccountOpeningBalanceListDto,
  SaveBankAccountOpeningBalancesInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

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
