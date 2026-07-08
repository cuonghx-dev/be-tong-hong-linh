import { ProductionOrderLineType, ProductionOrderStatus } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng của lệnh sản xuất (thành phẩm cần SX hoặc NVL định mức — không bút toán).
export class CreateProductionOrderLineDto {
  @ApiPropertyOptional({ enum: ProductionOrderLineType })
  @IsOptional()
  @IsEnum(ProductionOrderLineType)
  lineType?: ProductionOrderLineType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string

  @ApiProperty({ description: 'Số lượng' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity!: number

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string
}

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'Ngày (ISO)' })
  @IsDateString()
  orderDate!: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Đã lập đủ PN (phiếu nhập thành phẩm)' })
  @IsOptional()
  @IsBoolean()
  receiptComplete?: boolean

  @ApiPropertyOptional({ description: 'Đã lập đủ PX (phiếu xuất NVL)' })
  @IsOptional()
  @IsBoolean()
  issueComplete?: boolean

  @ApiPropertyOptional({ enum: ProductionOrderStatus })
  @IsOptional()
  @IsEnum(ProductionOrderStatus)
  status?: ProductionOrderStatus

  @ApiPropertyOptional({ description: 'Chi nhánh' })
  @IsOptional()
  @IsString()
  branchName?: string

  @ApiProperty({ type: [CreateProductionOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductionOrderLineDto)
  lines!: CreateProductionOrderLineDto[]
}
