import type { CostObjectDto, CostObjectFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách đối tượng THCP (lọc + phân trang).
export function useCostObjects(filter: CostObjectFilter) {
  return useQuery({
    queryKey: catalogKeys.costObjects(filter),
    queryFn: () =>
      api
        .get<Paginated<CostObjectDto>>('/catalog/cost-objects', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 đối tượng THCP.
export function useCostObject(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.costObject(id ?? ''),
    queryFn: () => api.get<CostObjectDto>(`/catalog/cost-objects/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
