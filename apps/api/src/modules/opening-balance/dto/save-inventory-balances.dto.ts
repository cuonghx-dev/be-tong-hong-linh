import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

// 1 dòng tồn kho đầu kỳ của 1 VTHH tại 1 kho khi lưu.
export class SaveInventoryBalanceLineDto {
  @ApiProperty({ description: 'ID vật tư, hàng hóa' })
  @IsString()
  @IsNotEmpty()
  productId!: string

  @ApiProperty({ description: 'Mã kho' })
  @IsString()
  warehouseCode!: string

  @ApiProperty({ description: 'Số lượng tồn' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity!: number

  @ApiProperty({ description: 'Giá trị tồn (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number
}

// Lưu toàn bộ bảng tồn kho đầu kỳ — thay thế dữ liệu cũ.
export class SaveInventoryBalancesDto {
  @ApiProperty({ type: [SaveInventoryBalanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveInventoryBalanceLineDto)
  items!: SaveInventoryBalanceLineDto[]
}
