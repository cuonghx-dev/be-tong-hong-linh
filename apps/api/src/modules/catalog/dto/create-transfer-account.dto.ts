import { TransferSide } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateTransferAccountDto {
  @ApiProperty({ description: 'Thứ tự kết chuyển (chạy tăng dần)' })
  @Type(() => Number)
  @IsInt()
  order!: number

  @ApiProperty({ description: 'Mã kết chuyển (VD "511-911")' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã kết chuyển không được để trống' })
  code!: string

  @ApiProperty({ description: 'Kết chuyển từ (mã TK)' })
  @IsString()
  fromAccount!: string

  @ApiProperty({ description: 'Kết chuyển đến (mã TK)' })
  @IsString()
  toAccount!: string

  @ApiProperty({ description: 'Bên kết chuyển: Nợ / Có / Hai bên', enum: TransferSide })
  @IsEnum(TransferSide)
  side!: TransferSide

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
