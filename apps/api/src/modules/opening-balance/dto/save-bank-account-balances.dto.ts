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

// 1 dòng số dư tiền gửi của 1 tài khoản ngân hàng khi lưu.
export class SaveBankAccountBalanceLineDto {
  @ApiProperty({ description: 'ID tài khoản ngân hàng' })
  @IsString()
  @IsNotEmpty()
  bankAccountId!: string

  @ApiProperty({ description: 'Dư Nợ (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount!: number

  @ApiProperty({ description: 'Dư Có (đồng)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount!: number
}

// Lưu toàn bộ số dư tiền gửi của 1 TK — thay thế dữ liệu cũ của TK đó.
export class SaveBankAccountBalancesDto {
  @ApiProperty({ description: 'Số TK tiền gửi (vd 1121, 1122)' })
  @IsString()
  @IsNotEmpty()
  accountCode!: string

  @ApiProperty({ type: [SaveBankAccountBalanceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveBankAccountBalanceLineDto)
  items!: SaveBankAccountBalanceLineDto[]
}
