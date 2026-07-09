import type { FixedAssetDto, FixedAssetFilter, FixedAssetTotals, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { fixedAssetKeys } from './keys'

// Danh sách trả về kèm dòng "Tổng" (tổng cộng toàn bộ tập đã lọc).
export type FixedAssetListResponse = Paginated<FixedAssetDto> & { totals: FixedAssetTotals }

// Sổ tài sản cố định (lọc + phân trang + tổng cộng).
export function useFixedAssets(filter: FixedAssetFilter) {
  return useQuery({
    queryKey: fixedAssetKeys.list(filter),
    queryFn: () =>
      api.get<FixedAssetListResponse>('/fixed-assets', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 thẻ tài sản.
export function useFixedAsset(id: string | null) {
  return useQuery({
    queryKey: fixedAssetKeys.detail(id ?? ''),
    queryFn: () => api.get<FixedAssetDto>(`/fixed-assets/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
