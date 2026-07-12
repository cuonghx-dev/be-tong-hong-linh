import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

// 1 dòng tài sản cố định đầu kỳ khi lưu.
export class SaveFixedAssetBalanceLineDto {
  @ApiProperty({ description: 'Mã tài sản' })
  @IsString()
  @IsNotEmpty()
  code!: string

  @ApiProperty({ description: 'Tên tài sản' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ description: 'Loại tài sản (Nhà cửa, Máy móc…)' })
  @IsString()
  assetType!: string

  @ApiProperty({ description: 'Đơn vị sử dụng' })
  @IsString()
  department!: string

  @ApiProperty({ description: 'Nguyên giá (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  originalCost!: number

  @ApiProperty({ description: 'Giá trị tính khấu hao (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depreciableValue!: number

  @ApiProperty({ description: 'Hao mòn lũy kế (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  accumulatedDepreciation!: number

  @ApiProperty({ description: 'Ngày ghi tăng (yyyy-MM-dd)' })
  @IsDateString()
  acquisitionDate!: string

  @ApiProperty({ description: 'Ngày bắt đầu tính khấu hao (yyyy-MM-dd)' })
  @IsDateString()
  depreciationDate!: string

  @ApiProperty({ description: 'Thời gian sử dụng (tháng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  usefulLifeMonths!: number

  @ApiProperty({ description: 'Thời gian sử dụng còn lại (tháng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  remainingMonths!: number

  @ApiProperty({ description: 'TK nguyên giá (vd 21112)' })
  @IsString()
  @IsNotEmpty()
  assetAccount!: string

  @ApiProperty({ description: 'TK khấu hao (vd 2141)' })
  @IsString()
  @IsNotEmpty()
  depreciationAccount!: string
}

// Lưu toàn bộ danh sách TSCĐ đầu kỳ — thay thế dữ liệu cũ.
export class SaveFixedAssetBalancesDto {
  @ApiProperty({ type: [SaveFixedAssetBalanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveFixedAssetBalanceLineDto)
  items!: SaveFixedAssetBalanceLineDto[]
}
