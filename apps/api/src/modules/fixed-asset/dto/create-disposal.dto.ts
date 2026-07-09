import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

// Dòng ghi giảm — 1 tài sản bị ghi giảm (snapshot nguyên giá/hao mòn/giá trị còn lại).
export class CreateDisposalLineDto {
  @ApiPropertyOptional({ description: 'ID thẻ TSCD (FK mềm)' })
  @IsOptional()
  @IsString()
  assetId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetName?: string

  @ApiPropertyOptional({ description: 'Nguyên giá' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  originalCost?: number

  @ApiPropertyOptional({ description: 'Hao mòn lũy kế' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  accumulatedDepreciation?: number

  @ApiPropertyOptional({ description: 'Giá trị còn lại' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  residualValue?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debitAccount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creditAccount?: string
}

// Chứng từ ghi giảm TSCD (nhượng bán, thanh lý…).
export class CreateDisposalDto {
  @ApiProperty({ description: 'Ngày hạch toán (ISO)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (ISO)' })
  @IsDateString()
  voucherDate!: string

  @ApiPropertyOptional({ description: 'Lý do ghi giảm' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiProperty({ type: [CreateDisposalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDisposalLineDto)
  lines!: CreateDisposalLineDto[]
}
