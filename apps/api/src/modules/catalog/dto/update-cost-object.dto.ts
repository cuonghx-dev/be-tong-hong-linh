import { PartialType } from '@nestjs/swagger'
import { CreateCostObjectDto } from './create-cost-object.dto'

export class UpdateCostObjectDto extends PartialType(CreateCostObjectDto) {}
