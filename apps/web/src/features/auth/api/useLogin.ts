import type { LoginResponse } from '@app/shared'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { useAuth } from '../store'

export function useLogin() {
  const setAuth = useAuth((s) => s.setAuth)
  return useMutation({
    mutationFn: (dto: { email: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', dto).then((r) => r.data),
    onSuccess: (data) => setAuth(data),
  })
}
