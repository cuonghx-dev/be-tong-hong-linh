import { useMemo } from 'react'
import { useProducts } from '@/features/catalog'
import type { ItemOption } from '@/shared/ui/item-picker'

// Nguồn VTHH cho picker (danh mục Vật tư hàng hóa đang sử dụng).
// Trả kèm dữ liệu ngầm định của VTHH để form chứng từ tự điền dòng hàng
// (ĐVT, kho ngầm định, TK Kho, đơn giá mua gần nhất, % thuế GTGT) — như MISA.
export function useItemOptions(keyword: string) {
  const kw = keyword.trim() || undefined
  const products = useProducts({ page: 1, pageSize: 20, keyword: kw, isActive: true })

  const items = useMemo<ItemOption[]>(
    () =>
      (products.data?.data ?? []).map((p): ItemOption => ({
        code: p.code,
        name: p.name,
        unit: p.unit,
        defaultWarehouseCode: p.defaultWarehouseCode,
        inventoryAccount: p.inventoryAccount,
        costAccount: p.costAccount,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        vatRate: p.vatRate,
      })),
    [products.data],
  )

  return { items, loading: products.isLoading }
}
