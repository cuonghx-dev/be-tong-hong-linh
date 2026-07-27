import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProductType } from '@prisma/client'
import { IsBoolean, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateProductDto {
  @ApiProperty({ description: 'Mã hàng hóa' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã hàng hóa không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên hàng hóa' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên hàng hóa không được để trống' })
  name!: string

  @ApiProperty({ enum: ProductType, description: 'Tính chất' })
  @IsEnum(ProductType)
  type!: ProductType

  @ApiPropertyOptional({ description: 'Nhóm VTHH (mã nhóm)' })
  @IsOptional()
  @IsString()
  groupCode?: string

  @ApiPropertyOptional({ description: 'Đơn vị tính chính' })
  @IsOptional()
  @IsString()
  unit?: string

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
  saleDescription?: string

  @ApiPropertyOptional({ description: 'Mã kho ngầm định' })
  @IsOptional()
  @IsString()
  defaultWarehouseCode?: string

  @ApiPropertyOptional({ description: 'Kho ngầm định' })
  @IsOptional()
  @IsString()
  defaultWarehouseName?: string

  @ApiPropertyOptional({ description: 'TK Kho' })
  @IsOptional()
  @IsString()
  inventoryAccount?: string

  @ApiPropertyOptional({ description: 'TK Doanh thu' })
  @IsOptional()
  @IsString()
  revenueAccount?: string

  @ApiPropertyOptional({ description: 'TK chiết khấu' })
  @IsOptional()
  @IsString()
  discountAccount?: string

  @ApiPropertyOptional({ description: 'TK Trả lại' })
  @IsOptional()
  @IsString()
  saleReturnAccount?: string

  @ApiPropertyOptional({ description: 'TK chi phí' })
  @IsOptional()
  @IsString()
  costAccount?: string

  @ApiPropertyOptional({ description: 'Đơn giá mua gần nhất' })
  @IsOptional()
  @IsNumberString()
  purchasePrice?: string

  @ApiPropertyOptional({ description: 'Đơn giá bán 1' })
  @IsOptional()
  @IsNumberString()
  salePrice?: string

  @ApiPropertyOptional({ description: 'Số lượng tồn tối thiểu' })
  @IsOptional()
  @IsNumberString()
  minStock?: string

  @ApiPropertyOptional({ description: 'Thuế suất GTGT (10/8/KCT/…)' })
  @IsOptional()
  @IsString()
  vatRate?: string

  @ApiPropertyOptional({ description: 'Giảm thuế theo quy định (text MISA)' })
  @IsOptional()
  @IsString()
  taxReduction?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
