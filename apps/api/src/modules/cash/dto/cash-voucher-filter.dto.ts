import { CashVoucherCategory, CashVoucherType } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class CashVoucherFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 20

  @ApiPropertyOptional({ enum: CashVoucherType })
  @IsOptional()
  @IsEnum(CashVoucherType)
  type?: CashVoucherType

  @ApiPropertyOptional({ enum: CashVoucherCategory })
  @IsOptional()
  @IsEnum(CashVoucherCategory)
  category?: CashVoucherCategory

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string

  @ApiPropertyOptional({ description: 'Tìm theo số chứng từ / diễn giải' })
  @IsOptional()
  @IsString()
  keyword?: string
}
