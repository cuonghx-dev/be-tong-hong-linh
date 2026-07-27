import { IncomeExpenseType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateIncomeExpenseItemDto {
  @ApiProperty({ description: 'Mã mục thu/chi' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã mục thu/chi không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên mục thu/chi' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên mục thu/chi không được để trống' })
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
