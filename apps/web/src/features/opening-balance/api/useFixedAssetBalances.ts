import type { FixedAssetOpeningBalanceDto } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

// Danh sách tài sản cố định đầu kỳ.
export function useFixedAssetBalances() {
  return useQuery({
    queryKey: openingBalanceKeys.fixedAssets(),
    queryFn: () =>
      api
        .get<FixedAssetOpeningBalanceDto[]>('/opening-balance/fixed-assets')
        .then((r) => r.data),
  })
}
