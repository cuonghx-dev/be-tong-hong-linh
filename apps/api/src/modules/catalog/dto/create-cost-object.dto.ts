import { CostObjectType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateCostObjectDto {
  @ApiProperty({ description: 'Mã đối tượng THCP' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã đối tượng THCP không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên đối tượng THCP' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên đối tượng THCP không được để trống' })
  name!: string

  @ApiProperty({ description: 'Loại: Sản phẩm / Phân xưởng / Khác', enum: CostObjectType })
  @IsEnum(CostObjectType)
  type!: CostObjectType

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
