import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString } from 'class-validator'

// Kỳ báo cáo bán hàng — bắt buộc cả 2 đầu (FE mặc định tháng hiện tại).
// customerId chỉ dùng cho 2 báo cáo công nợ phải thu KH.
export class SalesReportFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string

  @ApiPropertyOptional({ description: 'Lọc theo 1 khách hàng (id)' })
  @IsOptional()
  @IsString()
  customerId?: string
}
