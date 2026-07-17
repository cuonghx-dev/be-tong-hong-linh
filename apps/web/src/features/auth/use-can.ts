import { hasPermission, type Permission } from '@app/shared'
import { useAuth } from './store'

// Hook check quyền theo vai trò đang đăng nhập — dùng ẩn/hiện menu, nút ghi, route guard.
// Chỉ là UX (ẩn UI); chốt chặn thật nằm ở PermissionsGuard phía API.
export function useCan() {
  const role = useAuth((s) => s.user?.role)
  return (permission: Permission): boolean => !!role && hasPermission(role, permission)
}
