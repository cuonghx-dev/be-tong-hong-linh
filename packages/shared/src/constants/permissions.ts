// Phân quyền theo vai trò (RBAC tĩnh) — nguồn duy nhất dùng chung FE + BE.
// Permission = `<domain>:<action>`. Code chỉ check permission, KHÔNG check tên role.

import { UserRole } from '../enums'

// Domain khớp với module API (gắn @Domain(...) ở controller) và menu FE.
export const PERMISSION_DOMAINS = [
  'cash', // Tiền mặt
  'bank', // Tiền gửi
  'purchase', // Mua hàng
  'sales', // Bán hàng
  'inventory', // Kho
  'general', // Tổng hợp (chứng từ nghiệp vụ khác)
  'catalog', // Danh mục
  'dashboard', // Tổng quan
  'report', // Báo cáo
  'openingBalance', // Số dư ban đầu
  'bookLock', // Khóa sổ
  'users', // Quản lý người dùng (chỉ Admin)
] as const

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number]

// read = xem danh sách/chi tiết; write = tạo/sửa/xóa; post = ghi sổ / bỏ ghi (PATCH :id/posted).
export const PERMISSION_ACTIONS = ['read', 'write', 'post'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export type Permission = `${PermissionDomain}:${PermissionAction}`

const allActions = (domains: readonly PermissionDomain[]): Permission[] =>
  domains.flatMap((d) => PERMISSION_ACTIONS.map((a): Permission => `${d}:${a}`))

const readOnly = (domains: readonly PermissionDomain[]): Permission[] =>
  domains.map((d): Permission => `${d}:read`)

// Domain nghiệp vụ (mọi domain trừ quản lý user).
const BUSINESS_DOMAINS = PERMISSION_DOMAINS.filter((d) => d !== 'users')

// Bảng phân quyền theo vai trò. Thêm role mới = thêm entry, không sửa guard.
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  // Quản trị — toàn quyền, gồm cả quản lý người dùng.
  [UserRole.Admin]: allActions(PERMISSION_DOMAINS),
  // Kế toán — đủ nghiệp vụ + danh mục + báo cáo, trừ quản lý user.
  [UserRole.KeToan]: allActions(BUSINESS_DOMAINS),
  // Thủ quỹ/Thủ kho — xem + xác nhận (ghi sổ) tiền mặt/tiền gửi/kho; xem danh mục, báo cáo.
  [UserRole.ThuQuy]: [
    ...(['cash', 'bank', 'inventory'] as const).flatMap((d): Permission[] => [
      `${d}:read`,
      `${d}:post`,
    ]),
    ...readOnly(['catalog', 'dashboard', 'report']),
  ],
  // Giám đốc — chỉ xem mọi danh sách + báo cáo.
  [UserRole.Viewer]: readOnly(BUSINESS_DOMAINS),
}

// Check quyền — dùng ở PermissionsGuard (BE) và useCan (FE).
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
