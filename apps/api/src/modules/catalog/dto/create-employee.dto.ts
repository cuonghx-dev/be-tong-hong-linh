import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Mã nhân viên' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã nhân viên không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên nhân viên' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên nhân viên không được để trống' })
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
