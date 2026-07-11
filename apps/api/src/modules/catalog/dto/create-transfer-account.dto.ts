import { TransferSide } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator'

export class CreateTransferAccountDto {
  @ApiProperty({ description: 'Thứ tự kết chuyển (chạy tăng dần)' })
  @Type(() => Number)
  @IsInt()
  order!: number

  @ApiProperty({ description: 'Mã kết chuyển (VD "511-911")' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Kết chuyển từ (mã TK)' })
  @IsString()
  fromAccount!: string

  @ApiProperty({ description: 'Kết chuyển đến (mã TK)' })
  @IsString()
  toAccount!: string

  @ApiPropertyOptional({ description: 'Bên kết chuyển: Nợ / Có / Hai bên', enum: TransferSide })
  @IsOptional()
  @IsEnum(TransferSide)
  side?: TransferSide

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
