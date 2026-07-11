import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateVoucherTypeDto {
  @ApiProperty({ description: 'Mã loại chứng từ (VD "PC")' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên loại chứng từ' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
