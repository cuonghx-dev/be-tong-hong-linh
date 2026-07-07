import { PaymentMethod, PurchaseOrigin, PurchasePaymentMode, PurchaseVoucherType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng hàng tiền của chứng từ mua hàng.
export class CreatePurchaseVoucherLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string

  @ApiPropertyOptional({ description: 'Kho (chỉ loại nhập kho)' })
  @IsOptional()
  @IsString()
  warehouseId?: string

  @ApiPropertyOptional({ description: 'TK Kho (152/156/…)' })
  @IsOptional()
  @IsString()
  stockAccount?: string

  @ApiPropertyOptional({ description: 'TK Công nợ (mặc định 331)' })
  @IsOptional()
  @IsString()
  payableAccount?: string

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

  @ApiPropertyOptional({ description: '% Thuế GTGT' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate?: number

  @ApiPropertyOptional({ description: 'TK thuế GTGT (mặc định 1331)' })
  @IsOptional()
  @IsString()
  vatAccount?: string
}

export class CreatePurchaseVoucherDto {
  @ApiProperty({ enum: PurchaseVoucherType })
  @IsEnum(PurchaseVoucherType)
  type!: PurchaseVoucherType

  @ApiPropertyOptional({ enum: PurchaseOrigin, description: 'Nguồn gốc: trong nước / nhập khẩu' })
  @IsOptional()
  @IsEnum(PurchaseOrigin)
  origin?: PurchaseOrigin

  @ApiProperty({ enum: PurchasePaymentMode })
  @IsEnum(PurchasePaymentMode)
  paymentMode!: PurchasePaymentMode

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod

  @ApiPropertyOptional({ description: 'Nhận kèm hóa đơn' })
  @IsOptional()
  @IsBoolean()
  receiveWithInvoice?: boolean

  @ApiPropertyOptional({ description: 'Số hóa đơn' })
  @IsOptional()
  @IsString()
  invoiceNo?: string

  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierName?: string

  @ApiPropertyOptional({ description: 'Người giao hàng' })
  @IsOptional()
  @IsString()
  deliverer?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Nhân viên mua hàng' })
  @IsOptional()
  @IsString()
  employeeId?: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional({ description: 'Số hợp đồng mua' })
  @IsOptional()
  @IsString()
  contractNo?: string

  @ApiPropertyOptional({ description: 'Điều khoản thanh toán' })
  @IsOptional()
  @IsString()
  paymentTermId?: string

  @ApiPropertyOptional({ description: 'Số ngày được nợ' })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditDays?: number

  @ApiPropertyOptional({ description: 'Hạn thanh toán (ISO)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ description: 'Chi phí mua hàng' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number

  @ApiPropertyOptional({ description: 'Mã tra cứu HĐĐT' })
  @IsOptional()
  @IsString()
  einvoiceLookupCode?: string

  @ApiPropertyOptional({ description: 'Đường dẫn tra cứu HĐĐT' })
  @IsOptional()
  @IsString()
  einvoiceLookupUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string

  @ApiProperty({ type: [CreatePurchaseVoucherLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseVoucherLineDto)
  lines!: CreatePurchaseVoucherLineDto[]
}
