import type { CostObjectFilter, EmployeeFilter, PartnerGroupFilter } from '@app/shared'

// Query keys phân hệ Danh mục.
export const catalogKeys = {
  all: ['catalog'] as const,
  employees: (filter: EmployeeFilter) => [...catalogKeys.all, 'employees', filter] as const,
  employee: (id: string) => [...catalogKeys.all, 'employee', id] as const,
  partnerGroups: (filter: PartnerGroupFilter) =>
    [...catalogKeys.all, 'partner-groups', filter] as const,
  partnerGroup: (id: string) => [...catalogKeys.all, 'partner-group', id] as const,
  costObjects: (filter: CostObjectFilter) =>
    [...catalogKeys.all, 'cost-objects', filter] as const,
  costObject: (id: string) => [...catalogKeys.all, 'cost-object', id] as const,
}
