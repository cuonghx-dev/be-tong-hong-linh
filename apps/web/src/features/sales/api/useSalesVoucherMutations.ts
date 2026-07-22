import type {
  CreateSalesVoucherInput,
  SalesVoucherDto,
  UpdateSalesVoucherInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { bankKeys } from '@/features/bank'
import { cashKeys } from '@/features/cash'
import { inventoryKeys } from '@/features/inventory'
import { salesKeys } from './keys'

export function useCreateSalesVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: (dto: CreateSalesVoucherInput) =>
      api.post<SalesVoucherDto>('/sales/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ ảnh hưởng doanh thu + công nợ + hóa đơn → invalidate toàn phân hệ.
      // Chứng từ tự sinh (PT/NTTK/XK) → invalidate cả Tiền mặt + Tiền gửi + Kho.
      qc.invalidateQueries({ queryKey: salesKeys.all })
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

export function useImportSalesVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/sales/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useUpdateSalesVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSalesVoucherInput }) =>
      api.patch<SalesVoucherDto>(`/sales/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi (đổi cờ posted — đảo lại được).
export function useSetSalesVoucherPosted() {
  const qc = useQueryClient()
  return useMutation({
    meta: {
      success: (_d: unknown, v: unknown) =>
        (v as { posted: boolean }).posted ? 'Đã ghi sổ chứng từ' : 'Đã bỏ ghi chứng từ',
    },
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<SalesVoucherDto>(`/sales/vouchers/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}

export function useDeleteSalesVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa chứng từ' },
    mutationFn: (id: string) => api.delete(`/sales/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all })
      qc.invalidateQueries({ queryKey: cashKeys.all })
      qc.invalidateQueries({ queryKey: bankKeys.all })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}
