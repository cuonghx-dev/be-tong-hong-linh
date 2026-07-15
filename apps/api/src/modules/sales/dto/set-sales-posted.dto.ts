import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

// Ghi sổ (true) / bỏ ghi (false) một chứng từ bán hàng.
export class SetSalesPostedDto {
  @ApiProperty({ description: 'true = ghi sổ, false = bỏ ghi' })
  @IsBoolean()
  posted!: boolean
}
