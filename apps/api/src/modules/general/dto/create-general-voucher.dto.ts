import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
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
  debitAccount!: string

  @ApiProperty({ description: 'TK Có — tự nhập' })
  @IsString()
  creditAccount!: string

  @ApiProperty({ description: 'Số tiền dòng (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
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

export class CreateGeneralVoucherDto {
  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

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
