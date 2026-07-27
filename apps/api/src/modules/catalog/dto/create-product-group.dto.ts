import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateProductGroupDto {
  @ApiProperty({ description: 'Mã nhóm vật tư, hàng hóa, dịch vụ' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã nhóm vật tư, hàng hóa, dịch vụ không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên nhóm vật tư, hàng hóa, dịch vụ' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên nhóm vật tư, hàng hóa, dịch vụ không được để trống' })
  name!: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
