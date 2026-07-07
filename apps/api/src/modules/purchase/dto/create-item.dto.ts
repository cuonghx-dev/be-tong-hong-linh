import { ItemNature, ItemTaxReduction } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateItemDto {
  @ApiProperty({ description: 'Mã hàng hóa' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên hàng hóa' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ enum: ItemNature, description: 'Tính chất' })
  @IsOptional()
  @IsEnum(ItemNature)
  nature?: ItemNature

  @ApiPropertyOptional({ enum: ItemTaxReduction, description: 'Giảm thuế theo quy định' })
  @IsOptional()
  @IsEnum(ItemTaxReduction)
  taxReduction?: ItemTaxReduction

  @ApiPropertyOptional({ description: 'Nhóm VTHH' })
  @IsOptional()
  @IsString()
  groupName?: string

  @ApiPropertyOptional({ description: 'Đơn vị tính chính' })
  @IsOptional()
  @IsString()
  unit?: string

  @ApiPropertyOptional({ description: 'Số lượng tồn tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number

  @ApiPropertyOptional({ description: 'Thời hạn bảo hành (tháng)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  warrantyMonths?: number

  @ApiPropertyOptional({ description: 'Nguồn gốc' })
  @IsOptional()
  @IsString()
  origin?: string

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Diễn giải khi mua' })
  @IsOptional()
  @IsString()
  purchaseDescription?: string

  @ApiPropertyOptional({ description: 'Diễn giải khi bán' })
  @IsOptional()
  @IsString()
  salesDescription?: string

  @ApiPropertyOptional({ description: 'Kho ngầm định' })
  @IsOptional()
  @IsString()
  defaultWarehouse?: string

  @ApiPropertyOptional({ description: 'TK Kho' })
  @IsOptional()
  @IsString()
  stockAccount?: string

  @ApiPropertyOptional({ description: 'TK Doanh thu' })
  @IsOptional()
  @IsString()
  revenueAccount?: string

  @ApiPropertyOptional({ description: 'TK chi phí' })
  @IsOptional()
  @IsString()
  expenseAccount?: string

  @ApiPropertyOptional({ description: 'Đơn giá mua gần nhất' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice?: number

  @ApiPropertyOptional({ description: 'Đơn giá bán 1' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number

  @ApiPropertyOptional({ description: 'Thuế suất GTGT (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatRate?: number

  @ApiPropertyOptional({ description: 'Là đơn giá sau thuế' })
  @IsOptional()
  @IsBoolean()
  priceAfterTax?: boolean

  @ApiPropertyOptional({ description: 'Chi nhánh' })
  @IsOptional()
  @IsString()
  branchName?: string

  @ApiPropertyOptional({ description: 'Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
