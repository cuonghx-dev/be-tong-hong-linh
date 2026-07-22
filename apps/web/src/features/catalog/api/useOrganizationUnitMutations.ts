import type {
  CreateOrganizationUnitInput,
  OrganizationUnitDto,
  UpdateOrganizationUnitInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateOrganizationUnit() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm đơn vị' },
    mutationFn: (dto: CreateOrganizationUnitInput) =>
      api.post<OrganizationUnitDto>('/catalog/organization-units', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface OrganizationUnitImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportOrganizationUnits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<OrganizationUnitImportResult>('/catalog/organization-units/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateOrganizationUnit() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật đơn vị' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrganizationUnitInput }) =>
      api.patch<OrganizationUnitDto>(`/catalog/organization-units/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteOrganizationUnit() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa đơn vị', error: 'Xóa đơn vị thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/organization-units/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
