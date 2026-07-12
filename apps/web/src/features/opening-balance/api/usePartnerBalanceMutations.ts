import type { PartnerOpeningBalanceListDto, SavePartnerOpeningBalancesInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'

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
