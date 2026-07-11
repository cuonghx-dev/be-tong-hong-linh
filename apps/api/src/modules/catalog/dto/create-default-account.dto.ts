import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class CreateDefaultAccountDto {
  @ApiPropertyOptional({ description: 'STT trong danh sách (mặc định nối tiếp cuối)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number

  @ApiProperty({ description: 'Loại nghiệp vụ (VD "Phiếu thu tiền khách hàng")' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'TK Nợ ngầm định (mã TK)' })
  @IsOptional()
  @IsString()
  debitAccount?: string | null

  @ApiPropertyOptional({ description: 'TK Có ngầm định (mã TK)' })
  @IsOptional()
  @IsString()
  creditAccount?: string | null

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
