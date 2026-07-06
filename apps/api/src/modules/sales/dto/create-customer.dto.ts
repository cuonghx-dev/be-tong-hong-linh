import { CustomerType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class CreateCustomerDto {
  @ApiProperty({ description: 'Mã khách hàng (duy nhất)' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên khách hàng' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType

  @ApiPropertyOptional({ description: 'Là nhà cung cấp (đối tượng dùng chung)' })
  @IsOptional()
  @IsBoolean()
  isSupplier?: boolean

  @ApiPropertyOptional({ description: 'Đối tượng nội bộ' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean

  @ApiPropertyOptional({ description: 'MST/CCCD chủ hộ' })
  @IsOptional()
  @IsString()
  taxCode?: string

  @ApiPropertyOptional({ description: 'Mã số ĐVQHNS' })
  @IsOptional()
  @IsString()
  budgetRelationCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Nhóm khách hàng' })
  @IsOptional()
  @IsString()
  groupId?: string

  @ApiPropertyOptional({ description: 'Nhân viên bán hàng' })
  @IsOptional()
  @IsString()
  salesEmployeeId?: string

  @ApiPropertyOptional({ description: 'Người liên hệ' })
  @IsOptional()
  @IsString()
  contactName?: string

  @ApiPropertyOptional({ description: 'Email nhận HĐĐT' })
  @IsOptional()
  @IsString()
  contactEmail?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string
}
