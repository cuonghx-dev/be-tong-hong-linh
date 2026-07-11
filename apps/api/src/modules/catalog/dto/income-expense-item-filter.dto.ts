import { IncomeExpenseType } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class IncomeExpenseItemFilterDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo mã / tên' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: 'Lọc theo loại mục thu/chi', enum: IncomeExpenseType })
  @IsOptional()
  @IsEnum(IncomeExpenseType)
  type?: IncomeExpenseType

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái sử dụng' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean
}
