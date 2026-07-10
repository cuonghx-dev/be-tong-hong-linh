import { CostObjectType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class CreateCostObjectDto {
  @ApiProperty({ description: 'Mã đối tượng THCP' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên đối tượng THCP' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Loại: Sản phẩm / Phân xưởng / Khác', enum: CostObjectType })
  @IsOptional()
  @IsEnum(CostObjectType)
  type?: CostObjectType

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
