import type { GoodsIssueDto, GoodsIssueFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'

// Danh sách phiếu xuất kho (lọc + phân trang).
export function useGoodsIssues(filter: GoodsIssueFilter) {
  return useQuery({
    queryKey: inventoryKeys.issues(filter),
    queryFn: () =>
      api
        .get<Paginated<GoodsIssueDto>>('/inventory/issues', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 phiếu (dùng khi mở xem/sửa).
export function useGoodsIssue(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.issue(id ?? ''),
    queryFn: () => api.get<GoodsIssueDto>(`/inventory/issues/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
