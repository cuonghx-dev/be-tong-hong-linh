import type { CreateEmployeeInput, EmployeeDto, UpdateEmployeeInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm nhân viên' },
    mutationFn: (dto: CreateEmployeeInput) =>
      api.post<EmployeeDto>('/catalog/employees', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface EmployeeImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportEmployees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<EmployeeImportResult>('/catalog/employees/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật nhân viên' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeInput }) =>
      api.patch<EmployeeDto>(`/catalog/employees/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa nhân viên', error: 'Xóa nhân viên thất bại' },
    mutationFn: (id: string) => api.delete(`/catalog/employees/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
