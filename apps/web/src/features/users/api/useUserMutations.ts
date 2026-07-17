import type { CreateUserInput, UpdateUserInput, UserListItem } from '@app/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { userKeys } from './keys'

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserInput) =>
      api.post<UserListItem>('/users', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) =>
      api.patch<UserListItem>(`/users/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}
