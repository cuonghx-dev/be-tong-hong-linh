import { ItemNature } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ItemFilterDto {
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

  @ApiPropertyOptional({ enum: ItemNature, description: 'Lọc theo tính chất' })
  @IsOptional()
  @IsEnum(ItemNature)
  nature?: ItemNature

  @ApiPropertyOptional({ description: 'Nhóm VTHH' })
  @IsOptional()
  @IsString()
  groupName?: string

  @ApiPropertyOptional({ description: 'Chỉ lấy hàng hết (SL tồn ≤ 0)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  outOfStock?: boolean
}
