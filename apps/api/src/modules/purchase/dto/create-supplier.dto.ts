import { SupplierType } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class CreateSupplierDto {
  @ApiProperty({ description: 'Mã nhà cung cấp' })
  @IsString()
  code!: string

  @ApiProperty({ description: 'Tên nhà cung cấp' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType

  @ApiPropertyOptional({ description: 'Là khách hàng (đối tượng dùng chung)' })
  @IsOptional()
  @IsBoolean()
  isCustomer?: boolean

  @ApiPropertyOptional({ description: 'Mã số thuế/CCCD chủ hộ' })
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

  @ApiPropertyOptional({ description: 'Nhóm nhà cung cấp' })
  @IsOptional()
  @IsString()
  groupId?: string

  @ApiPropertyOptional({ description: 'Nhân viên mua hàng' })
  @IsOptional()
  @IsString()
  employeeId?: string

  @ApiPropertyOptional({ description: 'Là đối tượng nội bộ' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean

  @ApiPropertyOptional({ description: 'Rủi ro về hóa đơn' })
  @IsOptional()
  @IsString()
  invoiceRisk?: string

  @ApiPropertyOptional({ description: 'Ngừng sử dụng = false (ẩn khỏi picker chứng từ)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
