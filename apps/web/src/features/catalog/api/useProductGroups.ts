import type { Paginated, ProductGroupDto, ProductGroupFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách nhóm VTHH (lọc + phân trang).
export function useProductGroups(filter: ProductGroupFilter) {
  return useQuery({
    queryKey: catalogKeys.productGroups(filter),
    queryFn: () =>
      api
        .get<Paginated<ProductGroupDto>>('/catalog/product-groups', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 nhóm VTHH.
export function useProductGroup(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.productGroup(id ?? ''),
    queryFn: () => api.get<ProductGroupDto>(`/catalog/product-groups/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
