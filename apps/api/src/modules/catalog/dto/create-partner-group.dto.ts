import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreatePartnerGroupDto {
  @ApiProperty({ description: 'Mã nhóm KH, NCC' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã nhóm khách hàng, nhà cung cấp không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên nhóm khách hàng, nhà cung cấp' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên nhóm khách hàng, nhà cung cấp không được để trống' })
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
