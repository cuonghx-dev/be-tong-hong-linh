import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { hasPermission, UserRole, type Permission, type PermissionAction, type PermissionDomain } from '@app/shared'
import type { RequestUser } from '../decorators/current-user.decorator'
import { ACTION_KEY, DOMAIN_KEY } from '../decorators/domain.decorator'

// Guard phân quyền toàn cục — chạy SAU JwtAuthGuard. Controller gắn @Domain(d):
// action suy từ HTTP method (GET → read, còn lại → write), handler @Action('post')
// override cho endpoint ghi sổ. Không gắn @Domain → chỉ cần đăng nhập.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const domain = this.reflector.getAllAndOverride<PermissionDomain | undefined>(DOMAIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!domain) return true

    const request = context.switchToHttp().getRequest()
    const user: RequestUser | undefined = request.user
    // Route @Public không có user — JwtAuthGuard đã cho qua thì không xét quyền.
    if (!user) return true

    const explicitAction = this.reflector.getAllAndOverride<PermissionAction | undefined>(
      ACTION_KEY,
      [context.getHandler(), context.getClass()],
    )
    const action: PermissionAction =
      explicitAction ?? (request.method === 'GET' ? 'read' : 'write')

    const permission: Permission = `${domain}:${action}`
    // Cast role Prisma enum → shared enum (cùng giá trị chuỗi, nguồn enum kép).
    if (!hasPermission(user.role as unknown as UserRole, permission)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này')
    }
    return true
  }
}
