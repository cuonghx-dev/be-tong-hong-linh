import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

// Ghi sổ (true) / bỏ ghi (false) một phiếu xuất kho.
export class SetGoodsIssuePostedDto {
  @ApiProperty({ description: 'true = ghi sổ, false = bỏ ghi' })
  @IsBoolean()
  posted!: boolean
}
