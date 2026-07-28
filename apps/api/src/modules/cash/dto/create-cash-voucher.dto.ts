import { CashVoucherCategory, CashVoucherType, PartnerType } from '@app/shared'
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
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng hạch toán (bút toán) của phiếu thu/chi.
export class CreateCashVoucherLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: 'TK Nợ (thu → 1111)' })
  @IsString()
  debitAccount!: string

  @ApiProperty({ description: 'TK Có (chi → 1111)' })
  @IsString()
  creditAccount!: string

  @ApiProperty({ description: 'Số tiền dòng (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Số tiền dòng phải > 0' })
  amount!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operation?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerName?: string

  @ApiPropertyOptional({ description: 'Khoản mục CP (chỉ PC - Chi khác)' })
  @IsOptional()
  @IsString()
  costItemId?: string

  @ApiPropertyOptional({ description: 'TK ngân hàng (gửi tiền vào NH)' })
  @IsOptional()
  @IsString()
  bankAccountNo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string

  // ── Dòng thuế GTGT (tab "Kê khai hóa đơn và hạch toán thuế") ──────────────

  @ApiPropertyOptional({ description: 'Dòng thuế GTGT (Nợ 1331) — Chi mua ngoài có hóa đơn' })
  @IsOptional()
  @IsBoolean()
  isVatLine?: boolean

  @ApiPropertyOptional({ description: 'Có hóa đơn' })
  @IsOptional()
  @IsBoolean()
  hasInvoice?: boolean

  @ApiPropertyOptional({ description: '% thuế GTGT' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number

  @ApiPropertyOptional({ description: 'Ngày hóa đơn (ISO)' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string

  @ApiPropertyOptional({ description: 'Số hóa đơn' })
  @IsOptional()
  @IsString()
  invoiceNo?: string

  @ApiPropertyOptional({ description: 'Nhóm HHDV mua vào' })
  @IsOptional()
  @IsString()
  goodsServiceGroup?: string

  @ApiPropertyOptional({ description: 'Mã số thuế NCC' })
  @IsOptional()
  @IsString()
  supplierTaxCode?: string
}

export class CreateCashVoucherDto {
  @ApiProperty({ enum: CashVoucherType })
  @IsEnum(CashVoucherType)
  type!: CashVoucherType

  @ApiProperty({ enum: CashVoucherCategory })
  @IsEnum(CashVoucherCategory)
  category!: CashVoucherCategory

  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày phiếu (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional({ enum: PartnerType })
  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerName?: string

  @ApiPropertyOptional({ description: 'Người nộp (PT) / người nhận (PC)' })
  @IsOptional()
  @IsString()
  payerReceiver?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string

  @ApiPropertyOptional({ description: 'Lý do thu/chi' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string

  @ApiProperty({ type: [CreateCashVoucherLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCashVoucherLineDto)
  lines!: CreateCashVoucherLineDto[]
}
