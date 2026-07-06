import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './store'

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
