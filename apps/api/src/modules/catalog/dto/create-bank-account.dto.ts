import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Số tài khoản' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  accountNumber!: string

  @ApiProperty({ description: 'Tên ngân hàng' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  bankName!: string

  @ApiPropertyOptional({ description: 'Tên chi nhánh ngân hàng' })
  @IsOptional()
  @IsString()
  bankBranch?: string

  @ApiPropertyOptional({ description: 'Chủ tài khoản' })
  @IsOptional()
  @IsString()
  accountHolder?: string

  @ApiPropertyOptional({ description: 'Chi nhánh (đơn vị)' })
  @IsOptional()
  @IsString()
  branch?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
