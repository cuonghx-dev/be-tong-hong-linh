import { GeneralLineOperation } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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

  @ApiProperty({ type: [CreateGeneralVoucherLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGeneralVoucherLineDto)
  lines!: CreateGeneralVoucherLineDto[]
}
