import type { CreateInventoryItemInput, InventoryItemDto, UpdateInventoryItemInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInventoryItemInput) =>
      api.post<InventoryItemDto>('/purchase/items', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

export interface ItemImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ItemImportResult>('/purchase/items/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInventoryItemInput }) =>
      api.patch<InventoryItemDto>(`/purchase/items/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/purchase/items/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}
