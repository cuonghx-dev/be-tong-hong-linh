import type { InventoryOpeningBalanceListDto } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

// Tồn kho đầu kỳ vật tư, hàng hóa, CCDC — mọi VTHH + số tồn theo kho (0 nếu chưa nhập).
export function useInventoryBalances() {
  return useQuery({
    queryKey: openingBalanceKeys.inventory(),
    queryFn: () =>
      api
        .get<InventoryOpeningBalanceListDto>('/opening-balance/inventory')
        .then((r) => r.data),
  })
}
