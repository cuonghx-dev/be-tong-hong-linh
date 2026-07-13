import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

// Kỳ báo cáo Sổ nhật ký chung — phân trang theo chứng từ.
export class GeneralJournalFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number
}

// Kỳ báo cáo Sổ chi tiết các tài khoản — lọc theo TK (khớp tiền tố: 111 gồm 1111…).
export class AccountLedgerFilterDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fromDate!: string

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  toDate!: string

  @ApiPropertyOptional({ example: '131', description: 'Bỏ trống = mọi TK có số dư/phát sinh' })
  @IsOptional()
  @IsString()
  accountCode?: string
}
