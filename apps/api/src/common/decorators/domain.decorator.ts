import { SetMetadata } from '@nestjs/common'
import type { PermissionAction, PermissionDomain } from '@app/shared'

export const DOMAIN_KEY = 'permission_domain'
export const ACTION_KEY = 'permission_action'

// Gắn 1 lần ở class controller — PermissionsGuard check `<domain>:<action>` theo vai trò.
// Không gắn = endpoint chỉ cần đăng nhập (auth/me, refresh…).
export const Domain = (domain: PermissionDomain) => SetMetadata(DOMAIN_KEY, domain)

// Override action ở handler khi suy từ HTTP method không đúng — hiện chỉ dùng
// @Action('post') cho các endpoint ghi sổ PATCH :id/posted.
export const Action = (action: PermissionAction) => SetMetadata(ACTION_KEY, action)
