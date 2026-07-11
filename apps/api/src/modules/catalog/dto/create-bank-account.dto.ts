import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Số tài khoản' })
  @IsString()
  accountNumber!: string

  @ApiProperty({ description: 'Tên ngân hàng' })
  @IsString()
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
