import { BankPaymentMethod, BankVoucherCategory, BankVoucherType, PartnerType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng hạch toán (bút toán) của chứng từ thu/chi tiền gửi.
export class CreateBankVoucherLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: 'TK Nợ (thu → 1121)' })
  @IsString()
  debitAccount!: string

  @ApiProperty({ description: 'TK Có (chi → 1121)' })
  @IsString()
  creditAccount!: string

  @ApiProperty({ description: 'Số tiền dòng (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Số tiền dòng phải > 0' })
  amount!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerName?: string
}

export class CreateBankVoucherDto {
  @ApiProperty({ enum: BankVoucherType })
  @IsEnum(BankVoucherType)
  type!: BankVoucherType

  @ApiProperty({ enum: BankVoucherCategory })
  @IsEnum(BankVoucherCategory)
  category!: BankVoucherCategory

  @ApiPropertyOptional({ enum: BankPaymentMethod, description: 'Phương thức thanh toán — chỉ chi' })
  @IsOptional()
  @IsEnum(BankPaymentMethod)
  paymentMethod?: BankPaymentMethod

  @ApiPropertyOptional({ description: 'Là UNC chuyển tiền theo lô — chỉ chi' })
  @IsOptional()
  @IsBoolean()
  isBatchTransfer?: boolean

  @ApiPropertyOptional({ description: 'Số UNC từ chi nhánh khác chuyển đến — chỉ thu' })
  @IsOptional()
  @IsString()
  internalRef?: string

  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiProperty({ description: 'TK ngân hàng của đơn vị (nộp vào / tài khoản chi)' })
  @IsString()
  @IsNotEmpty({ message: 'Chọn tài khoản ngân hàng' })
  bankAccountNo!: string

  @ApiPropertyOptional({ description: 'Tên ngân hàng (auto theo TK)' })
  @IsOptional()
  @IsString()
  bankName?: string

  @ApiPropertyOptional({ description: 'Tài khoản nhận — chỉ chi' })
  @IsOptional()
  @IsString()
  receiverAccountNo?: string

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string

  @ApiPropertyOptional({ description: 'Lý do thu / nội dung thanh toán' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional({ description: 'Tham chiếu' })
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string

  @ApiProperty({ type: [CreateBankVoucherLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBankVoucherLineDto)
  lines!: CreateBankVoucherLineDto[]
}
