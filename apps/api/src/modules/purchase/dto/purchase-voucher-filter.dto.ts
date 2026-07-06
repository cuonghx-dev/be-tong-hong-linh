import { PurchasePaymentStatus, PurchaseReceiveStatus, PurchaseVoucherType } from '@app/shared'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class PurchaseVoucherFilterDto {
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

  @ApiPropertyOptional({ enum: PurchaseVoucherType })
  @IsOptional()
  @IsEnum(PurchaseVoucherType)
  type?: PurchaseVoucherType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string

  @ApiPropertyOptional({ enum: PurchaseReceiveStatus })
  @IsOptional()
  @IsEnum(PurchaseReceiveStatus)
  receiveStatus?: PurchaseReceiveStatus

  @ApiPropertyOptional({ enum: PurchasePaymentStatus })
  @IsOptional()
  @IsEnum(PurchasePaymentStatus)
  paymentStatus?: PurchasePaymentStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string

  @ApiPropertyOptional({ description: 'Tìm theo số chứng từ / số hóa đơn / NCC' })
  @IsOptional()
  @IsString()
  keyword?: string
}
