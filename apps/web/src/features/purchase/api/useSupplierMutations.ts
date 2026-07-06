import type { CreateSupplierInput, SupplierDto, UpdateSupplierInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { purchaseKeys } from './keys'

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSupplierInput) =>
      api.post<SupplierDto>('/purchase/suppliers', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSupplierInput }) =>
      api.patch<SupplierDto>(`/purchase/suppliers/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/purchase/suppliers/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}
