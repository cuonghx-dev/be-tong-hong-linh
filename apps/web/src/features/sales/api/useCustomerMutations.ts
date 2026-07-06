import type { CreateCustomerInput, CustomerDto, UpdateCustomerInput } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { salesKeys } from './keys'

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCustomerInput) =>
      api.post<CustomerDto>('/sales/customers', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.all }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCustomerInput }) =>
      api.patch<CustomerDto>(`/sales/customers/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.all }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sales/customers/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.all }),
  })
}
