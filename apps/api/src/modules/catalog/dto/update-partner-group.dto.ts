import { PartialType } from '@nestjs/swagger'
import { CreatePartnerGroupDto } from './create-partner-group.dto'

export class UpdatePartnerGroupDto extends PartialType(CreatePartnerGroupDto) {}
