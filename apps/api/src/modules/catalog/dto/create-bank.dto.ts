import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateBankDto {
  @ApiProperty({ description: 'Tên viết tắt' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên viết tắt ngân hàng không được để trống' })
  shortName!: string

  @ApiProperty({ description: 'Tên đầy đủ' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên đầy đủ ngân hàng không được để trống' })
  fullName!: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
