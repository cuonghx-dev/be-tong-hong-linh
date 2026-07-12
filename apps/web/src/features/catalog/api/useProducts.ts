import type { Paginated, ProductDto, ProductFilter } from '@app/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

// Danh sách hàng hóa, dịch vụ (lọc + phân trang).
export function useProducts(filter: ProductFilter) {
  return useQuery({
    queryKey: catalogKeys.products(filter),
    queryFn: () =>
      api.get<Paginated<ProductDto>>('/catalog/products', { params: filter }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

// Chi tiết 1 hàng hóa.
export function useProduct(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.product(id ?? ''),
    queryFn: () => api.get<ProductDto>(`/catalog/products/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
