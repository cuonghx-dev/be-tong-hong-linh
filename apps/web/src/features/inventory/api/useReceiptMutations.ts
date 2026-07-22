import type {
  CreateInventoryReceiptInput,
  InventoryReceiptDto,
  UpdateInventoryReceiptInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { inventoryKeys } from './keys'

export function useCreateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: (dto: CreateInventoryReceiptInput) =>
      api.post<InventoryReceiptDto>('/inventory/receipts', dto).then((r) => r.data),
    onSuccess: () => {
      // Phiếu nhập kho ảnh hưởng tồn kho → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportReceipts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/inventory/receipts/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useUpdateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInventoryReceiptInput }) =>
      api.patch<InventoryReceiptDto>(`/inventory/receipts/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi (đổi cờ posted — đảo lại được).
export function useSetReceiptPosted() {
  const qc = useQueryClient()
  return useMutation({
    meta: {
      success: (_d: unknown, v: unknown) =>
        (v as { posted: boolean }).posted ? 'Đã ghi sổ chứng từ' : 'Đã bỏ ghi chứng từ',
    },
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api
        .patch<InventoryReceiptDto>(`/inventory/receipts/${id}/posted`, { posted })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useDeleteReceipt() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa chứng từ' },
    mutationFn: (id: string) => api.delete(`/inventory/receipts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}
