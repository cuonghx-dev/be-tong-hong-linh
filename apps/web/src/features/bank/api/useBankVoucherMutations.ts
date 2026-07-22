import type { BankVoucherDto, CreateBankVoucherInput, UpdateBankVoucherInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { bankKeys } from './keys'

export function useCreateBankVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: (dto: CreateBankVoucherInput) =>
      api.post<BankVoucherDto>('/bank/vouchers', dto).then((r) => r.data),
    onSuccess: () => {
      // Chứng từ tiền gửi ảnh hưởng sổ ngân hàng + công nợ → invalidate toàn phân hệ.
      qc.invalidateQueries({ queryKey: bankKeys.all })
    },
  })
}

export function useUpdateBankVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: (d: unknown) => `Đã lưu chứng từ ${(d as { voucherNo: string }).voucherNo}` },
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBankVoucherInput }) =>
      api.patch<BankVoucherDto>(`/bank/vouchers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.all })
    },
  })
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportBankVouchers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/bank/vouchers/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.all })
    },
  })
}

// Ghi sổ / bỏ ghi chứng từ — ảnh hưởng sổ tiền gửi + báo cáo → invalidate toàn phân hệ.
export function useSetBankVoucherPosted() {
  const qc = useQueryClient()
  return useMutation({
    meta: {
      success: (_d: unknown, v: unknown) =>
        (v as { posted: boolean }).posted ? 'Đã ghi sổ chứng từ' : 'Đã bỏ ghi chứng từ',
    },
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      api.patch<BankVoucherDto>(`/bank/vouchers/${id}/posted`, { posted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.all })
    },
  })
}

export function useDeleteBankVoucher() {
  const qc = useQueryClient()
  return useMutation({
    meta: { success: 'Đã xóa chứng từ', error: 'Xóa chứng từ thất bại' },
    mutationFn: (id: string) => api.delete(`/bank/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.all })
    },
  })
}
