import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class CustomerFilterDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo mã / tên / MST' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string

  @ApiPropertyOptional({ description: 'true = chỉ KH đang theo dõi (picker chứng từ)' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean
}
