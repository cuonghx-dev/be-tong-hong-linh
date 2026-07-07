import { PartnerType } from '@app/shared'
import { useMemo } from 'react'
import { useSuppliers } from '@/features/purchase/api/useSuppliers'
import { useCustomers } from '@/features/sales/api/useCustomers'
import type { PartnerOption } from '@/shared/ui/partner-picker'

// Nguồn đối tượng tạm: gộp Khách hàng + Nhà cung cấp (client-side).
// TODO: thay bằng endpoint /partners (union + phân trang server) khi có.
export function usePartnerOptions(keyword: string) {
  const kw = keyword.trim() || undefined
  const customers = useCustomers({ page: 1, pageSize: 20, keyword: kw })
  const suppliers = useSuppliers({ page: 1, pageSize: 20, keyword: kw })

  const items = useMemo<PartnerOption[]>(
    () => [
      ...(customers.data?.data ?? []).map(
        (c): PartnerOption => ({
          code: c.code,
          name: c.name,
          type: PartnerType.Customer,
          taxCode: c.taxCode,
          address: c.address,
          phone: c.phone,
        }),
      ),
      ...(suppliers.data?.data ?? []).map(
        (s): PartnerOption => ({
          code: s.code,
          name: s.name,
          type: PartnerType.Supplier,
          taxCode: s.taxCode,
          address: s.address,
          phone: s.phone,
        }),
      ),
    ],
    [customers.data, suppliers.data],
  )

  return { items, loading: customers.isLoading || suppliers.isLoading }
}
