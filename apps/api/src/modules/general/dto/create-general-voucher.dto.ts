import { GeneralLineOperation, GeneralTaxType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng hạch toán (bút toán) của chứng từ nghiệp vụ khác.
export class CreateGeneralVoucherLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: 'TK Nợ — tự nhập' })
  @IsString()
  @IsNotEmpty({ message: 'TK Nợ không được để trống' })
  debitAccount!: string

  @ApiProperty({ description: 'TK Có — tự nhập' })
  @IsString()
  @IsNotEmpty({ message: 'TK Có không được để trống' })
  creditAccount!: string

  @ApiProperty({ description: 'Số tiền dòng (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Số tiền dòng phải > 0' })
  amount!: number

  @ApiPropertyOptional({ enum: GeneralLineOperation, description: 'Nghiệp vụ (dropdown MISA)' })
  @IsOptional()
  @IsEnum(GeneralLineOperation)
  operation?: GeneralLineOperation

  @ApiPropertyOptional({ description: 'Đối tượng vế Nợ (mã)' })
  @IsOptional()
  @IsString()
  debitPartnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debitPartnerName?: string

  @ApiPropertyOptional({ description: 'Đối tượng vế Có (mã)' })
  @IsOptional()
  @IsString()
  creditPartnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creditPartnerName?: string
}

// Dòng kê khai hóa đơn (tab "Kê khai hóa đơn và hạch toán thuế") — chỉ lên
// bảng kê thuế GTGT, KHÔNG sinh bút toán nên không ràng buộc TK Nợ/Có.
export class CreateGeneralVoucherTaxLineDto {
  @ApiPropertyOptional({ description: 'Diễn giải thuế' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Có hóa đơn', default: true })
  @IsOptional()
  @IsBoolean()
  hasInvoice?: boolean

  @ApiPropertyOptional({ enum: GeneralTaxType, description: 'Loại thuế' })
  @IsOptional()
  @IsEnum(GeneralTaxType)
  taxType?: GeneralTaxType

  @ApiPropertyOptional({ description: 'Giá trị HHDV chưa thuế (đồng)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxableAmount?: number

  @ApiPropertyOptional({ description: '% thuế GTGT' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate?: number

  @ApiPropertyOptional({ description: 'Tiền thuế GTGT (đồng)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number

  @ApiPropertyOptional({ description: 'TK thuế GTGT (vd 1331)' })
  @IsOptional()
  @IsString()
  vatAccount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNo?: string

  @ApiPropertyOptional({ description: 'Ngày hóa đơn (ISO)' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string

  @ApiPropertyOptional({ description: 'Nhóm HHDV' })
  @IsOptional()
  @IsString()
  goodsServiceGroup?: string

  @ApiPropertyOptional({ description: 'Mã đối tượng trên hóa đơn' })
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerName?: string

  @ApiPropertyOptional({ description: 'Mã số thuế' })
  @IsOptional()
  @IsString()
  supplierTaxCode?: string
}

export class CreateGeneralVoucherDto {
  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional({ description: 'Hạn thanh toán (ISO)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Tham chiếu — số chứng từ gốc/hợp đồng' })
  @IsOptional()
  @IsString()
  referenceNo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string

  @ApiPropertyOptional({ description: 'Không lên bảng kê thuế GTGT' })
  @IsOptional()
  @IsBoolean()
  excludeFromVatReport?: boolean

  @ApiProperty({ type: [CreateGeneralVoucherLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGeneralVoucherLineDto)
  lines!: CreateGeneralVoucherLineDto[]

  @ApiPropertyOptional({ type: [CreateGeneralVoucherTaxLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGeneralVoucherTaxLineDto)
  taxLines?: CreateGeneralVoucherTaxLineDto[]
}
