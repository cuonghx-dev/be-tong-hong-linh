import type {
  CreateProductionOrderInput,
  ProductionOrderDto,
  UpdateProductionOrderInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'
import type { ImportResult } from './useReceiptMutations'

export function useCreateProductionOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateProductionOrderInput) =>
      api.post<ProductionOrderDto>('/inventory/production-orders', dto).then((r) => r.data),
    onSuccess: () => {
      // Lệnh sản xuất liên quan tồn kho/tiến độ SX → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useImportProductionOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/inventory/production-orders/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useUpdateProductionOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductionOrderInput }) =>
      api
        .patch<ProductionOrderDto>(`/inventory/production-orders/${id}`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useDeleteProductionOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/inventory/production-orders/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}
