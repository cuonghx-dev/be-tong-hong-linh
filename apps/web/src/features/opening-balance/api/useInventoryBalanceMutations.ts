import type {
  InventoryOpeningBalanceListDto,
  SaveInventoryOpeningBalancesInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { openingBalanceKeys } from './keys'
import type { ImportResult } from './useAccountBalanceMutations'

// Lưu cả bảng tồn kho đầu kỳ (thay thế dữ liệu cũ). Ảnh hưởng cả số dư TK kho (152/153/155/156).
export function useSaveInventoryBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SaveInventoryOpeningBalancesInput) =>
      api
        .put<InventoryOpeningBalanceListDto>('/opening-balance/inventory', dto)
        .then((r) => r.data),
    onSuccess: () => {
      // 1 lần lưu tồn kho đổi cả số dư TK kho tổng → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}

// Nhập khẩu tồn kho đầu kỳ từ file Excel MISA (bỏ qua VTHH+kho đã có số tồn).
export function useImportInventoryBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/opening-balance/inventory/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: openingBalanceKeys.all })
    },
  })
}
