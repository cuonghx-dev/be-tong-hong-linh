import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @ApiProperty({ example: 'ketoan@ketoan.vn' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(1)
  name!: string

  @ApiProperty({ enum: UserRole, example: UserRole.KETOAN })
  @IsEnum(UserRole)
  role!: UserRole

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string
}
