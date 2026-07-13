import type { AuthUser, LoginResponse, RefreshResponse } from '@app/shared'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (payload: LoginResponse) => void
  setTokens: (payload: RefreshResponse) => void
  logout: () => void
}

// Store xác thực — user + cặp token JWT, persist localStorage.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'ke-toan-auth',
      // v1: thêm token JWT. State mock cũ (chỉ có user, không token) bị reset về đăng xuất.
      version: 1,
      migrate: () => ({ user: null, accessToken: null, refreshToken: null }),
    },
  ),
)
