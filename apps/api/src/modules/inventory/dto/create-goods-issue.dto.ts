import { GoodsIssueCategory } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng hàng của phiếu xuất kho.
export class CreateGoodsIssueLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string

  @ApiPropertyOptional({ description: 'Kho' })
  @IsOptional()
  @IsString()
  warehouseId?: string

  @ApiPropertyOptional({ description: 'TK Nợ (giá vốn 632 / chi phí 621…)' })
  @IsOptional()
  @IsString()
  debitAccount?: string

  @ApiPropertyOptional({ description: 'TK Có (kho 152/155/156)' })
  @IsOptional()
  @IsString()
  creditAccount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string

  @ApiProperty({ description: 'Số lượng' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity!: number

  @ApiProperty({ description: 'Đơn giá' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number

  @ApiPropertyOptional({ description: 'Số lô' })
  @IsOptional()
  @IsString()
  lotNo?: string

  @ApiPropertyOptional({ description: 'Hạn sử dụng (ISO)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string
}

export class CreateGoodsIssueDto {
  @ApiProperty({ enum: GoodsIssueCategory })
  @IsEnum(GoodsIssueCategory)
  category!: GoodsIssueCategory

  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional({ description: 'Mã khách hàng' })
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional({ description: 'Tên khách hàng' })
  @IsOptional()
  @IsString()
  customerName?: string

  @ApiPropertyOptional({ description: 'Người nhận' })
  @IsOptional()
  @IsString()
  receiver?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Nhân viên bán hàng' })
  @IsOptional()
  @IsString()
  salesEmployeeId?: string

  @ApiPropertyOptional({ description: 'Lý do xuất / Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional({ description: 'Địa điểm giao hàng' })
  @IsOptional()
  @IsString()
  deliveryLocation?: string

  @ApiPropertyOptional({ description: 'Chi nhánh' })
  @IsOptional()
  @IsString()
  branchName?: string

  @ApiProperty({ type: [CreateGoodsIssueLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsIssueLineDto)
  lines!: CreateGoodsIssueLineDto[]
}
