import { InvoiceIssueStatus } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class InvoiceFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 20

  @ApiPropertyOptional({ enum: InvoiceIssueStatus })
  @IsOptional()
  @IsEnum(InvoiceIssueStatus)
  issueStatus?: InvoiceIssueStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string

  @ApiPropertyOptional({ description: 'Tìm theo số hóa đơn / khách hàng' })
  @IsOptional()
  @IsString()
  keyword?: string
}
