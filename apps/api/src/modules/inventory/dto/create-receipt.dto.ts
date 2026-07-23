import { InventoryReceiptType } from '@app/shared'
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

// Dòng hàng của phiếu nhập kho.
export class CreateInventoryReceiptLineDto {
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

  @ApiPropertyOptional({ description: 'TK Nợ (kho 155/156)' })
  @IsOptional()
  @IsString()
  debitAccount?: string

  @ApiPropertyOptional({ description: 'TK Có (đối ứng 331/154)' })
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

export class CreateInventoryReceiptDto {
  @ApiProperty({ enum: InventoryReceiptType })
  @IsEnum(InventoryReceiptType)
  receiptType!: InventoryReceiptType

  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional({ description: 'Mã đối tượng' })
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional({ description: 'Tên đối tượng' })
  @IsOptional()
  @IsString()
  partnerName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Người giao hàng' })
  @IsOptional()
  @IsString()
  deliverer?: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Tham chiếu' })
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional({ description: 'Chi nhánh' })
  @IsOptional()
  @IsString()
  branchName?: string

  @ApiProperty({ type: [CreateInventoryReceiptLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryReceiptLineDto)
  lines!: CreateInventoryReceiptLineDto[]
}
