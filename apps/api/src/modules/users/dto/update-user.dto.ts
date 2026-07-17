import { ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ description: 'false = khóa tài khoản (không hard delete)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ minLength: 6, description: 'Chỉ gửi khi đổi mật khẩu' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string
}
