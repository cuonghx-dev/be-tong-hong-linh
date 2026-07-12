import type { BankAccountOpeningBalanceListDto } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

// Số dư tiền gửi đầu kỳ chi tiết theo tài khoản ngân hàng của 1 TK tiền gửi (vd 1121).
export function useBankAccountBalances(accountCode: string) {
  return useQuery({
    queryKey: openingBalanceKeys.bankAccounts(accountCode),
    enabled: !!accountCode,
    queryFn: () =>
      api
        .get<BankAccountOpeningBalanceListDto>('/opening-balance/bank-accounts', {
          params: { accountCode },
        })
        .then((r) => r.data),
  })
}
