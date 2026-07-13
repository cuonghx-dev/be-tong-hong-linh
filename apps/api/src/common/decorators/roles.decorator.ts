import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@prisma/client'

export const ROLES_KEY = 'roles'

// Giới hạn endpoint theo vai trò. Không gắn = mọi người dùng đã đăng nhập đều gọi được.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
