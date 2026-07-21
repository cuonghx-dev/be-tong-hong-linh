import { PaymentMethod } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator'

// 1 dòng phân bổ tiền thu vào 1 chứng từ bán hàng chưa thu.
export class CollectPaymentAllocationDto {
  @ApiProperty({ description: 'Id chứng từ bán hàng được đối trừ' })
  @IsString()
  salesVoucherId!: string

  @ApiProperty({ description: 'Số tiền đối trừ (≤ số còn phải thu của chứng từ)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number
}

// Thu tiền khách hàng theo hóa đơn: sinh phiếu thu (TM) / thu tiền gửi (CK)
// hạch toán Có 131 + ghi đối trừ vào từng chứng từ bán hàng.
export class CollectPaymentDto {
  @ApiProperty()
  @IsString()
  customerId!: string

  @ApiProperty({ description: 'Ngày hạch toán (YYYY-MM-DD)' })
  @IsDateString()
  postingDate!: string

  @ApiProperty({ description: 'Ngày chứng từ (YYYY-MM-DD)' })
  @IsDateString()
  voucherDate!: string

  @ApiProperty({ enum: PaymentMethod, description: 'Tiền mặt → phiếu thu; CK → thu tiền gửi' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod

  @ApiPropertyOptional({ description: 'TKNH nhận tiền — bắt buộc khi chuyển khoản' })
  @IsOptional()
  @IsString()
  bankAccountNo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string

  @ApiPropertyOptional({ description: 'Lý do thu' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ type: [CollectPaymentAllocationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CollectPaymentAllocationDto)
  allocations!: CollectPaymentAllocationDto[]
}
