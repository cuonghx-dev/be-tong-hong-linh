import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: { name: string; email: string } | null
  login: (email: string) => void
  logout: () => void
}

// Store xác thực tối giản (mock). TODO: nối API + refresh token.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (email) => set({ user: { name: email.split('@')[0] || 'Người dùng', email } }),
      logout: () => set({ user: null }),
    }),
    { name: 'ke-toan-auth' },
  ),
)
