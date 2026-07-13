import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import type { UserRole } from '@prisma/client'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { RequestUser } from '../../common/decorators/current-user.decorator'

// Payload access token: sub = userId.
export interface AccessTokenPayload {
  sub: string
  email: string
  role: UserRole
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
  }

  // Kết quả trả về gắn vào req.user.
  validate(payload: AccessTokenPayload): RequestUser {
    return { userId: payload.sub, email: payload.email, role: payload.role }
  }
}
