import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

// Kỳ thống kê widget Tình hình tài chính.
export class FinancePeriodDto {
  @ApiPropertyOptional({ enum: ['month', 'quarter', 'year'], default: 'month' })
  @IsOptional()
  @IsIn(['month', 'quarter', 'year'])
  period: 'month' | 'quarter' | 'year' = 'month'
}

// Năm thống kê (mặc định năm hiện tại) cho các widget theo năm.
export class YearQueryDto {
  @ApiPropertyOptional({ description: 'Năm dương lịch, mặc định năm hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number
}

// Giới hạn số dòng top (tồn kho / bán chạy).
export class TopQueryDto extends YearQueryDto {
  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number
}
