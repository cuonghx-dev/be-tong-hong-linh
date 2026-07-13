import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { UserRole } from '@prisma/client'

// Payload đã xác thực gắn vào request (JwtStrategy.validate).
export interface RequestUser {
  userId: string
  email: string
  role: UserRole
}

// Lấy người dùng hiện tại từ request: @CurrentUser() user: RequestUser.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser =>
    ctx.switchToHttp().getRequest().user,
)
