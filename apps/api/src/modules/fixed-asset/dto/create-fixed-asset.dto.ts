import { FixedAssetStatus } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

// Payload tạo thẻ tài sản cố định (Ghi tăng). Số chứng từ (voucherNo) tự sinh, không nhận từ client.
export class CreateFixedAssetDto {
  @ApiProperty({ description: 'Mã tài sản' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên tài sản' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Loại tài sản' })
  @IsOptional()
  @IsString()
  assetType?: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Kèm theo (chứng từ gốc)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentCount?: number

  @ApiPropertyOptional({ description: 'Đơn vị sử dụng' })
  @IsOptional()
  @IsString()
  department?: string

  @ApiPropertyOptional({ description: 'Ngày ghi tăng (ISO)' })
  @IsOptional()
  @IsDateString()
  increaseDate?: string

  @ApiPropertyOptional({ description: 'Ngày bắt đầu tính KH (ISO)' })
  @IsOptional()
  @IsDateString()
  depreciationStartDate?: string

  @ApiPropertyOptional({ description: 'Thời gian sử dụng (tháng)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  usefulLifeMonths?: number

  @ApiPropertyOptional({ description: 'Thời gian sử dụng còn lại (tháng)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainingMonths?: number

  @ApiPropertyOptional({ description: 'Nguyên giá' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  originalCost?: number

  @ApiPropertyOptional({ description: 'Giá trị tính KH' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depreciableValue?: number

  @ApiPropertyOptional({ description: 'Hao mòn lũy kế' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  accumulatedDepreciation?: number

  @ApiPropertyOptional({ description: 'Giá trị còn lại' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  residualValue?: number

  @ApiPropertyOptional({ description: 'Giá trị KH tháng' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyDepreciation?: number

  @ApiPropertyOptional({ description: 'TK nguyên giá (2111x)' })
  @IsOptional()
  @IsString()
  costAccount?: string

  @ApiPropertyOptional({ description: 'TK khấu hao (2141)' })
  @IsOptional()
  @IsString()
  depreciationAccount?: string

  @ApiPropertyOptional({ enum: FixedAssetStatus })
  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus
}
