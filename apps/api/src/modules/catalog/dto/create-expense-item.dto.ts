import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateExpenseItemDto {
  @ApiProperty({ description: 'Mã khoản mục chi phí (phân cấp qua dấu chấm, VD: MTC.VL)' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã khoản mục chi phí không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên khoản mục chi phí' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên khoản mục chi phí không được để trống' })
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
