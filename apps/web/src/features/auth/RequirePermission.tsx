import type { Permission } from '@app/shared'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCan } from './use-can'

// Guard route theo quyền — không đủ quyền thì đưa về trang chủ.
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const can = useCan()
  if (!can(permission)) return <Navigate to="/" replace />
  return <>{children}</>
}
