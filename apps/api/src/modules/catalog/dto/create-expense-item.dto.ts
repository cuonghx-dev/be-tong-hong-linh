import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateExpenseItemDto {
  @ApiProperty({ description: 'Mã khoản mục chi phí (phân cấp qua dấu chấm, VD: MTC.VL)' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên khoản mục chi phí' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Diễn giải' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Thuộc khoản mục (id cha) — chuỗi rỗng = khoản mục gốc' })
  @IsOptional()
  @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
