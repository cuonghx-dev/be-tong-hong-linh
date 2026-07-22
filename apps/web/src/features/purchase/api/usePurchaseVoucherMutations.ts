import type {
  CreatePurchaseVoucherInput,
  PurchaseVoucherDto,
  UpdatePurchaseVoucherInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { bankKeys } from '@/features/bank'
import { cashKeys } from '@/features/cash'
import { inventoryKeys } from '@/features/inventory'
import { purchaseKeys } from './keys'

export function useCreatePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: (dto: CreatePurchaseVoucherInput) =>
      api.post<PurchaseVoucherDto>('/purchase/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ mua hàng ảnh hưởng công nợ + tồn kho → invalidate toàn phân hệ.
      // Chứng từ tự sinh (PC/UNC/phiếu nhập) → invalidate cả Tiền mặt + Tiền gửi + Kho.
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportPurchaseVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/purchase/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
    },
  })
}

export function useUpdatePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePurchaseVoucherInput }) =>
      api.patch<PurchaseVoucherDto>(`/purchase/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi (đổi cờ posted — đảo lại được).
export function useSetPurchaseVoucherPosted() {
  const qc = useQueryClient()
  return useMutation({
    meta: {
      success: (_d: unknown, v: unknown) =>
        (v as { posted: boolean }).posted ? 'Đã ghi sổ chứng từ' : 'Đã bỏ ghi chứng từ',
    },
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<PurchaseVoucherDto>(`/purchase/vouchers/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useDeletePurchaseVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa chứng từ', error: 'Xóa chứng từ thất bại' },
    mutationFn: (id: string) => api.delete(`/purchase/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}
