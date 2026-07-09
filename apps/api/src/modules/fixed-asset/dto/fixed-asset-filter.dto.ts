import { FixedAssetStatus } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class FixedAssetFilterDto {
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

  @ApiPropertyOptional({ description: 'Loại tài sản' })
  @IsOptional()
  @IsString()
  assetType?: string

  @ApiPropertyOptional({ enum: FixedAssetStatus })
  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus

  @ApiPropertyOptional({ description: 'Từ ngày ghi tăng (ISO)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string

  @ApiPropertyOptional({ description: 'Đến ngày ghi tăng (ISO)' })
  @IsOptional()
  @IsDateString()
  toDate?: string

  @ApiPropertyOptional({ description: 'Tìm theo mã / tên tài sản / đơn vị sử dụng' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({
    enum: ['code', 'increaseDate'],
    description: 'Sắp xếp: mã tài sản (Sổ) hoặc ngày ghi tăng giảm dần (Ghi tăng)',
  })
  @IsOptional()
  @IsIn(['code', 'increaseDate'])
  orderBy?: 'code' | 'increaseDate'
}
