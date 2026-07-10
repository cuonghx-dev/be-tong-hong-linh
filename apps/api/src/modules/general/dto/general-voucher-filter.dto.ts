import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class GeneralVoucherFilterDto {
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
