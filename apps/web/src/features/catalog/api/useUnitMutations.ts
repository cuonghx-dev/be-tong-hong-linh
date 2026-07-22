import type { CreateUnitInput, UnitDto, UpdateUnitInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateUnit() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm đơn vị tính' },
    mutationFn: (dto: CreateUnitInput) =>
      api.post<UnitDto>('/catalog/units', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface UnitImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportUnits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<UnitImportResult>('/catalog/units/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateUnit() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật đơn vị tính' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUnitInput }) =>
      api.patch<UnitDto>(`/catalog/units/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteUnit() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa đơn vị tính', error: 'Xóa đơn vị tính thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/units/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
