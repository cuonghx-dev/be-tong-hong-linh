import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Mã kho' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã kho không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên kho' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên kho không được để trống' })
  name!: string

  @ApiPropertyOptional({ description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Chi nhánh' })
  @IsOptional()
  @IsString()
  branch?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
