import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { UserRole } from '@prisma/client'
import type { RequestUser } from '../decorators/current-user.decorator'
import { ROLES_KEY } from '../decorators/roles.decorator'

// Guard vai trò toàn cục — chỉ chặn endpoint có gắn @Roles(); không gắn thì cho qua.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true
    const user: RequestUser | undefined = context.switchToHttp().getRequest().user
    return !!user && required.includes(user.role)
  }
}
