import type { Paginated, UnitDto, UnitFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách đơn vị tính (lọc + phân trang).
export function useUnits(filter: UnitFilter) {
  return useQuery({
    queryKey: catalogKeys.units(filter),
    queryFn: () =>
      api.get<Paginated<UnitDto>>('/catalog/units', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 đơn vị tính.
export function useUnit(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.unit(id ?? ''),
    queryFn: () => api.get<UnitDto>(`/catalog/units/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
