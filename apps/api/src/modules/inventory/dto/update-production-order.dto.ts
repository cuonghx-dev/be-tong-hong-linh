import { PartialType } from '@nestjs/swagger'
import { CreateProductionOrderDto } from './create-production-order.dto'

// Sửa lệnh sản xuất — cho sửa toàn bộ trường (kể cả trạng thái + hai cờ PN/PX).
export class UpdateProductionOrderDto extends PartialType(CreateProductionOrderDto) {}
