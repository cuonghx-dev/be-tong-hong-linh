import { ApiPropertyOptional } from '@nestjs/swagger'
import { ReceivableAging, ReceivableStatus } from '@app/shared'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator'

// Bộ lọc màn hình Đối chiếu công nợ phải trả NCC.
export class PayableFilterDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo mã / tên / MST' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: "Mã TK công nợ (vd '331'); rỗng = tất cả" })
  @IsOptional()
  @IsString()
  account?: string

  @ApiPropertyOptional({ enum: ReceivableAging })
  @IsOptional()
  @IsEnum(ReceivableAging)
  aging?: ReceivableAging

  @ApiPropertyOptional({ enum: ReceivableStatus })
  @IsOptional()
  @IsEnum(ReceivableStatus)
  status?: ReceivableStatus

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD): số dư tính đến ngày này' })
  @IsOptional()
  @IsISO8601()
  toDate?: string
}
