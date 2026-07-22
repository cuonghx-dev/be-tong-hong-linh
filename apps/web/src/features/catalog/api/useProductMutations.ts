import type { CreateProductInput, ProductDto, UpdateProductInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm hàng hóa' },
    mutationFn: (dto: CreateProductInput) =>
      api.post<ProductDto>('/catalog/products', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface ProductImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ProductImportResult>('/catalog/products/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật hàng hóa' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductInput }) =>
      api.patch<ProductDto>(`/catalog/products/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa hàng hóa', error: 'Xóa hàng hóa thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/products/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
