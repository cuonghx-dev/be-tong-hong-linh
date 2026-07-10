import type { Paginated, PartnerGroupDto, PartnerGroupFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách nhóm KH, NCC (lọc + phân trang).
export function usePartnerGroups(filter: PartnerGroupFilter) {
  return useQuery({
    queryKey: catalogKeys.partnerGroups(filter),
    queryFn: () =>
      api
        .get<Paginated<PartnerGroupDto>>('/catalog/partner-groups', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 nhóm KH, NCC.
export function usePartnerGroup(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.partnerGroup(id ?? ''),
    queryFn: () => api.get<PartnerGroupDto>(`/catalog/partner-groups/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
