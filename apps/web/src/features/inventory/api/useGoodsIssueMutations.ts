import type {
  CreateGoodsIssueInput,
  GoodsIssueDto,
  UpdateGoodsIssueInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'

export function useCreateGoodsIssue() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: (dto: CreateGoodsIssueInput) =>
      api.post<GoodsIssueDto>('/inventory/issues', dto).then((r) => r.data),
    onSuccess: () => {
      // Phiếu xuất kho ảnh hưởng tồn kho → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportGoodsIssues() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/inventory/issues/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useUpdateGoodsIssue() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateGoodsIssueInput }) =>
      api.patch<GoodsIssueDto>(`/inventory/issues/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi phiếu xuất kho — bỏ ghi loại phiếu khỏi sổ sách + tồn kho.
export function useSetGoodsIssuePosted() {
  const qc = useQueryClient()
  return useMutation({
    meta: {
      success: (_d: unknown, v: unknown) =>
        (v as { posted: boolean }).posted ? 'Đã ghi sổ chứng từ' : 'Đã bỏ ghi chứng từ',
    },
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<GoodsIssueDto>(`/inventory/issues/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useDeleteGoodsIssue() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa chứng từ' },
    mutationFn: (id: string) => api.delete(`/inventory/issues/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}
