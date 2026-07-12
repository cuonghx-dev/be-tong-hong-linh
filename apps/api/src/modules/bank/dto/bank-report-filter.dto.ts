import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString } from 'class-validator'

// Kỳ báo cáo tiền gửi — bắt buộc cả 2 đầu (FE mặc định tháng hiện tại).
export class BankReportFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string

  @ApiPropertyOptional({ description: 'Lọc theo số TK ngân hàng' })
  @IsOptional()
  @IsString()
  bankAccountNo?: string
}

// Bảng kê số dư ngân hàng chỉ cần 1 mốc thời điểm.
export class BankBalanceFilterDto {
  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string
}
