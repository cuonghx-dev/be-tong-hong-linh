import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator'

// Kỳ báo cáo tổng hợp tồn kho — bắt buộc cả 2 đầu (FE mặc định tháng hiện tại).
export class StockSummaryFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string

  @ApiPropertyOptional({ description: 'Lọc theo mã kho' })
  @IsOptional()
  @IsString()
  warehouseCode?: string

  @ApiPropertyOptional({ description: 'Lọc theo mã/tên VTHH' })
  @IsOptional()
  @IsString()
  keyword?: string
}

// Sổ chi tiết vật tư hàng hóa — bắt buộc chọn 1 VTHH (mã).
export class ItemLedgerFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string

  @ApiProperty({ description: 'Mã VTHH' })
  @IsString()
  @IsNotEmpty()
  itemCode!: string

  @ApiPropertyOptional({ description: 'Lọc theo mã kho' })
  @IsOptional()
  @IsString()
  warehouseCode?: string
}
