import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

// Kỳ báo cáo tiền mặt — bắt buộc cả 2 đầu (FE mặc định tháng hiện tại).
export class CashReportFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string
}
