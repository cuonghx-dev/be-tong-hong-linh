import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

export class SetBookLockDto {
  @ApiProperty({ description: 'Ngày khóa sổ (YYYY-MM-DD)', example: '2026-06-30' })
  @IsDateString()
  lockDate!: string
}
