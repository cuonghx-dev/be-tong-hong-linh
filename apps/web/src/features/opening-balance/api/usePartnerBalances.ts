import type { PartnerOpeningBalanceListDto } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

// Số dư công nợ đầu kỳ chi tiết theo đối tượng của 1 TK công nợ (vd 131 theo KH).
export function usePartnerBalances(accountCode: string) {
  return useQuery({
    queryKey: openingBalanceKeys.partners(accountCode),
    enabled: !!accountCode,
    queryFn: () =>
      api
        .get<PartnerOpeningBalanceListDto>('/opening-balance/partners', {
          params: { accountCode },
        })
        .then((r) => r.data),
  })
}
