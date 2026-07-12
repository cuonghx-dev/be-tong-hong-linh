import { ApiPropertyOptional } from '@nestjs/swagger'
import { ProductType } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ProductFilterDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo mã / tên / nhóm' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ enum: ProductType, description: 'Lọc theo tính chất' })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái sử dụng' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean
}
