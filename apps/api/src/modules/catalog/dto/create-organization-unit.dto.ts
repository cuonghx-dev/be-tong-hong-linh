import { OrgUnitLevel } from '@app/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class CreateOrganizationUnitDto {
  @ApiProperty({ description: 'Mã đơn vị' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã đơn vị không được để trống' })
  code!: string

  @ApiProperty({ description: 'Tên đơn vị' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên đơn vị không được để trống' })
  name!: string

  @ApiPropertyOptional({ description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiProperty({ description: 'Cấp tổ chức', enum: OrgUnitLevel })
  @IsEnum(OrgUnitLevel)
  level!: OrgUnitLevel

  @ApiPropertyOptional({ description: 'Thuộc đơn vị (id cha) — chuỗi rỗng = đơn vị gốc' })
  @IsOptional()
  @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: 'Trạng thái: Đang sử dụng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
