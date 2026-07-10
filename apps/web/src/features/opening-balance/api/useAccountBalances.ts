import type { AccountOpeningBalanceDto } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

// Danh sách số dư tài khoản đầu kỳ (đã sắp theo số TK).
export function useAccountBalances() {
  return useQuery({
    queryKey: openingBalanceKeys.accounts(),
    queryFn: () =>
      api.get<AccountOpeningBalanceDto[]>('/opening-balance/accounts').then((r) => r.data),
  })
}
