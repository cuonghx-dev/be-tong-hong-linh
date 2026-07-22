import type {
  CreateIncomeExpenseItemInput,
  IncomeExpenseItemDto,
  UpdateIncomeExpenseItemInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreateIncomeExpenseItem() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã thêm mục thu/chi' },
    mutationFn: (dto: CreateIncomeExpenseItemInput) =>
      api.post<IncomeExpenseItemDto>('/catalog/income-expense-items', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface IncomeExpenseItemImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportIncomeExpenseItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<IncomeExpenseItemImportResult>('/catalog/income-expense-items/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdateIncomeExpenseItem() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã cập nhật mục thu/chi' },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateIncomeExpenseItemInput }) =>
      api
        .patch<IncomeExpenseItemDto>(`/catalog/income-expense-items/${id}`, dto)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeleteIncomeExpenseItem() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa mục thu/chi', error: 'Xóa mục thu/chi thất bại' },
    mutationFn: (id: string) =>
      api.delete(`/catalog/income-expense-items/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
