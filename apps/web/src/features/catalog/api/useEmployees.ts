import type { EmployeeDto, EmployeeFilter, Paginated } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách nhân viên (lọc + phân trang).
export function useEmployees(filter: EmployeeFilter) {
  return useQuery({
    queryKey: catalogKeys.employees(filter),
    queryFn: () =>
      api.get<Paginated<EmployeeDto>>('/catalog/employees', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 nhân viên.
export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.employee(id ?? ''),
    queryFn: () => api.get<EmployeeDto>(`/catalog/employees/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
