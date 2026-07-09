import type {
  CreateFixedAssetDisposalInput,
  FixedAssetDisposalDto,
  UpdateFixedAssetDisposalInput,
} from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { fixedAssetKeys } from './keys'

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useCreateDisposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFixedAssetDisposalInput) =>
      api.post<FixedAssetDisposalDto>('/fixed-assets/disposals', dto).then((r) => r.data),
    // Ghi giảm đổi tình trạng thẻ TSCD → invalidate cả Sổ tài sản lẫn danh sách ghi giảm.
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}

export function useUpdateDisposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFixedAssetDisposalInput }) =>
      api.patch<FixedAssetDisposalDto>(`/fixed-assets/disposals/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}

export function useDeleteDisposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/fixed-assets/disposals/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}

// Nhập khẩu Danh sách ghi giảm từ file Excel.
export function useImportDisposals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/fixed-assets/disposals/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}
