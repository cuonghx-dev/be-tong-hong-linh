import { BankVoucherCategory, BankVoucherType } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class BankVoucherFilterDto {
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

  @ApiPropertyOptional({ enum: BankVoucherType })
  @IsOptional()
  @IsEnum(BankVoucherType)
  type?: BankVoucherType

  @ApiPropertyOptional({ enum: BankVoucherCategory })
  @IsOptional()
  @IsEnum(BankVoucherCategory)
  category?: BankVoucherCategory

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional({ description: 'Lọc theo số TK ngân hàng' })
  @IsOptional()
  @IsString()
  bankAccountNo?: string

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
