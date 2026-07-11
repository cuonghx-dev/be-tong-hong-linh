import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateBankDto {
  @ApiProperty({ description: 'Tên viết tắt' })
  @IsString()
  shortName!: string

  @ApiProperty({ description: 'Tên đầy đủ' })
  @IsString()
  fullName!: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
