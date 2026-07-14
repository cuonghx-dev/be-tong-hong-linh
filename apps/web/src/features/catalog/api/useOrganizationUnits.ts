import type { OrganizationUnitDto, OrganizationUnitFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách cơ cấu tổ chức (lọc + phân trang).
export function useOrganizationUnits(filter: OrganizationUnitFilter) {
  return useQuery({
    queryKey: catalogKeys.organizationUnits(filter),
    queryFn: () =>
      api
        .get<Paginated<OrganizationUnitDto>>('/catalog/organization-units', { params: filter })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 đơn vị.
export function useOrganizationUnit(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.organizationUnit(id ?? ''),
    queryFn: () =>
      api.get<OrganizationUnitDto>(`/catalog/organization-units/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
