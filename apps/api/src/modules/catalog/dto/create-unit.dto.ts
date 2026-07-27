import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateUnitDto {
  @ApiProperty({ description: 'Đơn vị tính (VD "Cái")' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên đơn vị tính không được để trống' })
  name!: string

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string | null

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
