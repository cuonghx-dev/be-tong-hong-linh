import type { FixedAssetDisposalDto, FixedAssetDisposalFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { fixedAssetKeys } from './keys'

// Danh sách ghi giảm TSCD (lọc + phân trang).
export function useDisposals(filter: FixedAssetDisposalFilter) {
  return useQuery({
    queryKey: fixedAssetKeys.disposals(filter),
    queryFn: () =>
      api
        .get<Paginated<FixedAssetDisposalDto>>('/fixed-assets/disposals', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 chứng từ ghi giảm (dùng khi mở xem/sửa).
export function useDisposal(id: string | null) {
  return useQuery({
    queryKey: fixedAssetKeys.disposal(id ?? ''),
    queryFn: () =>
      api.get<FixedAssetDisposalDto>(`/fixed-assets/disposals/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
