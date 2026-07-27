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

// 1 dòng số dư tài khoản khi lưu cả bảng.
export class SaveAccountBalanceLineDto {
  @ApiProperty({ description: 'Số tài khoản (vd 111, 1111)' })
  @IsString()
  @IsNotEmpty()
  accountCode!: string

  @ApiProperty({ description: 'Tên tài khoản' })
  @IsString()
  @IsNotEmpty({ message: 'Tên tài khoản không được để trống' })
  accountName!: string

  @ApiProperty({ description: 'Dư Nợ (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount!: number

  @ApiProperty({ description: 'Dư Có (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount!: number
}

// Lưu toàn bộ bảng số dư tài khoản — thay thế dữ liệu cũ.
export class SaveAccountBalancesDto {
  @ApiProperty({ type: [SaveAccountBalanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAccountBalanceLineDto)
  items!: SaveAccountBalanceLineDto[]
}
