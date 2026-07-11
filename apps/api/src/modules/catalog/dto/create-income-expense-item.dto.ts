import { IncomeExpenseType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class CreateIncomeExpenseItemDto {
  @ApiProperty({ description: 'Mã mục thu/chi' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên mục thu/chi' })
  @IsString()
  name!: string

  @ApiProperty({ description: 'Loại: Mục thu / Mục chi', enum: IncomeExpenseType })
  @IsEnum(IncomeExpenseType)
  type!: IncomeExpenseType

  @ApiPropertyOptional({ description: 'Phát sinh định kỳ' })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
