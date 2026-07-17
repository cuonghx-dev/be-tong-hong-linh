import type { UserListItem } from '@app/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { userKeys } from './keys'

// Danh sách người dùng (chỉ ADMIN gọi được — API chặn theo domain 'users').
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => api.get<UserListItem[]>('/users').then((r) => r.data),
  })
}
