import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Mã nhân viên' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên nhân viên' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'Chức danh' })
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional({ description: 'Tên đơn vị (phòng ban)' })
  @IsOptional()
  @IsString()
  department?: string

  @ApiPropertyOptional({ description: 'Số tài khoản ngân hàng' })
  @IsOptional()
  @IsString()
  bankAccount?: string

  @ApiPropertyOptional({ description: 'Tên ngân hàng' })
  @IsOptional()
  @IsString()
  bankName?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
