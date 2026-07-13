import { PartnerType } from '@app/shared'
import { useMemo } from 'react'
import { useEmployees } from '@/features/catalog'
import type { PartnerOption } from '@/shared/ui/partner-picker'

// Nguồn nhân viên cho picker (danh mục Nhân viên đang sử dụng).
export function useEmployeeOptions(keyword: string) {
  const kw = keyword.trim() || undefined
  const employees = useEmployees({ page: 1, pageSize: 20, keyword: kw, isActive: true })

  const items = useMemo<PartnerOption[]>(
    () =>
      (employees.data?.data ?? []).map(
        (e): PartnerOption => ({
          code: e.code,
          name: e.name,
          type: PartnerType.Employee,
          address: e.department,
        }),
      ),
    [employees.data],
  )

  return { items, loading: employees.isLoading }
}
