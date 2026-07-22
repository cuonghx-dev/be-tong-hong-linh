import type { CostObjectDto, CreateCostObjectInput, UpdateCostObjectInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateCostObject() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm đối tượng THCP' },
    mutationFn: (dto: CreateCostObjectInput) =>
      api.post<CostObjectDto>('/catalog/cost-objects', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface CostObjectImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportCostObjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<CostObjectImportResult>('/catalog/cost-objects/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateCostObject() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật đối tượng THCP' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCostObjectInput }) =>
      api.patch<CostObjectDto>(`/catalog/cost-objects/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteCostObject() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa đối tượng THCP', error: 'Xóa đối tượng THCP thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/cost-objects/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
