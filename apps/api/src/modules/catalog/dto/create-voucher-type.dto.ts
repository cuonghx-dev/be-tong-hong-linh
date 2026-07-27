import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateVoucherTypeDto {
  @ApiProperty({ description: 'Mã loại chứng từ (VD "PC")' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã loại chứng từ không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên loại chứng từ' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên loại chứng từ không được để trống' })
  name!: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
