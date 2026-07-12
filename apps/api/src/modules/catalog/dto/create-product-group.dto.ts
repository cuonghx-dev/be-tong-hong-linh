import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateProductGroupDto {
  @ApiProperty({ description: 'Mã nhóm vật tư, hàng hóa, dịch vụ' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên nhóm vật tư, hàng hóa, dịch vụ' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
