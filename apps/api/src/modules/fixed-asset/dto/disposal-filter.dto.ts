import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class DisposalFilterDto {
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

  @ApiPropertyOptional({ description: 'Từ ngày (Ngày hạch toán)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string

  @ApiPropertyOptional({ description: 'Đến ngày (Ngày hạch toán)' })
  @IsOptional()
  @IsDateString()
  toDate?: string

  @ApiPropertyOptional({ description: 'Tìm theo số chứng từ / lý do ghi giảm' })
  @IsOptional()
  @IsString()
  keyword?: string
}
