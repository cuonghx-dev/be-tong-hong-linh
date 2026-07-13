import type { AuthUser, LoginResponse, RefreshResponse } from '@app/shared'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'
import { compare } from 'bcryptjs'
import { PrismaService } from '../../database/prisma.service'
import type { AccessTokenPayload } from './jwt.strategy'

// Payload refresh token — chỉ mang sub + type để phân biệt với access token.
interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
}

const DEFAULT_ACCESS_TTL = '15m'
const DEFAULT_REFRESH_TTL = '7d'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Đăng nhập bằng email + mật khẩu → cặp access/refresh token.
  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }
    return { ...this.signTokens(user), user: this.toAuthUser(user) }
  }

  // Đổi refresh token còn hạn lấy cặp token mới (stateless — không lưu DB).
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    let payload: RefreshTokenPayload
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn')
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn')
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa')
    }
    return this.signTokens(user)
  }

  // Thông tin người dùng hiện tại (GET /auth/me).
  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa')
    }
    return this.toAuthUser(user)
  }

  private signTokens(user: User): { accessToken: string; refreshToken: string } {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }
    const refreshPayload: RefreshTokenPayload = { sub: user.id, type: 'refresh' }
    return {
      accessToken: this.jwt.sign(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', DEFAULT_ACCESS_TTL),
      }),
      refreshToken: this.jwt.sign(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', DEFAULT_REFRESH_TTL),
      }),
    }
  }

  private toAuthUser(user: User): AuthUser {
    // Cast role Prisma enum → shared enum (cùng giá trị chuỗi, nguồn enum kép).
    return { id: user.id, email: user.email, name: user.name, role: user.role as AuthUser['role'] }
  }
}
