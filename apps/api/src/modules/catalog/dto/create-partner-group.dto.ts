import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreatePartnerGroupDto {
  @ApiProperty({ description: 'Mã nhóm KH, NCC' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên nhóm khách hàng, nhà cung cấp' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
