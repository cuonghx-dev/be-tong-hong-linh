import { AccountNature } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class CreateAccountDto {
  @ApiProperty({ description: 'Số tài khoản (phân cấp theo tiền tố, VD: 1111 thuộc 111)' })
  @IsString()
  number!: string

  @ApiProperty({ description: 'Tên tài khoản' })
  @IsString()
  name!: string

  @ApiProperty({ enum: AccountNature, description: 'Tính chất: Dư Nợ / Dư Có / Lưỡng tính' })
  @IsEnum(AccountNature)
  nature!: AccountNature

  @ApiPropertyOptional({ description: 'Tên tiếng Anh' })
  @IsOptional()
  @IsString()
  nameEn?: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Thuộc tài khoản (id cha) — chuỗi rỗng = tài khoản gốc' })
  @IsOptional()
  @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
