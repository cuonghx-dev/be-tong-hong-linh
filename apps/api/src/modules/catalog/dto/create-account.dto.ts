import { AccountNature } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateAccountDto {
  @ApiProperty({ description: 'Số tài khoản (phân cấp theo tiền tố, VD: 1111 thuộc 111)' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  number!: string

  @ApiProperty({ description: 'Tên tài khoản' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên tài khoản không được để trống' })
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
