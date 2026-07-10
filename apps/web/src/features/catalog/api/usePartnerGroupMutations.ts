import type { CreatePartnerGroupInput, PartnerGroupDto, UpdatePartnerGroupInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { catalogKeys } from './keys'

export function useCreatePartnerGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePartnerGroupInput) =>
      api.post<PartnerGroupDto>('/catalog/partner-groups', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export interface PartnerGroupImportResult {
  total: number
  created: number
  skipped: number
}

export function useImportPartnerGroups() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<PartnerGroupImportResult>('/catalog/partner-groups/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useUpdatePartnerGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePartnerGroupInput }) =>
      api.patch<PartnerGroupDto>(`/catalog/partner-groups/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}

export function useDeletePartnerGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/partner-groups/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  })
}
