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

// 1 dòng số dư công nợ của 1 đối tượng khi lưu.
export class SavePartnerBalanceLineDto {
  @ApiProperty({ description: 'ID đối tượng (khách hàng hoặc nhà cung cấp)' })
  @IsString()
  @IsNotEmpty()
  partnerId!: string

  @ApiProperty({ description: 'Dư Nợ (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount!: number

  @ApiProperty({ description: 'Dư Có (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount!: number
}

// Lưu toàn bộ số dư công nợ của 1 TK — thay thế dữ liệu cũ của TK đó.
export class SavePartnerBalancesDto {
  @ApiProperty({ description: 'Số TK công nợ (vd 131, 331)' })
  @IsString()
  @IsNotEmpty()
  accountCode!: string

  @ApiProperty({ type: [SavePartnerBalanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavePartnerBalanceLineDto)
  items!: SavePartnerBalanceLineDto[]
}
