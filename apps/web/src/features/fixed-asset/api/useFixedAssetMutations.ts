import type { CreateFixedAssetInput, FixedAssetDto, UpdateFixedAssetInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { fixedAssetKeys } from './keys'

export interface ImportResult {
  total: number
  created: number
  skipped: number
}

export function useCreateFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFixedAssetInput) =>
      api.post<FixedAssetDto>('/fixed-assets', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}

export function useUpdateFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFixedAssetInput }) =>
      api.patch<FixedAssetDto>(`/fixed-assets/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}

export function useDeleteFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fixed-assets/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}

// Nhập khẩu Sổ tài sản cố định từ file Excel.
export function useImportFixedAssets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportResult>('/fixed-assets/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAssetKeys.all }),
  })
}
