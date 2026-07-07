import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator'

// Tạo hóa đơn nhập tay (header-only). Hóa đơn sinh ở trạng thái chưa phát hành,
// số HĐ + mã CQT được cấp khi "Phát hành" (§5).
export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Loại hóa đơn (mặc định "Hóa đơn GTGT")' })
  @IsOptional()
  @IsString()
  invoiceType?: string

  @ApiProperty({ description: 'Ngày hóa đơn (ISO)' })
  @IsDateString()
  invoiceDate!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string

  @ApiPropertyOptional({ description: 'Hình thức thanh toán (TM/CK)' })
  @IsOptional()
  @IsString()
  paymentForm?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string

  @ApiPropertyOptional({ description: 'Ký hiệu HĐ' })
  @IsOptional()
  @IsString()
  symbol?: string

  @ApiPropertyOptional({ description: 'Mẫu số HĐ' })
  @IsOptional()
  @IsString()
  templateNo?: string

  @ApiProperty({ description: 'Giá trị hóa đơn' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string
}
