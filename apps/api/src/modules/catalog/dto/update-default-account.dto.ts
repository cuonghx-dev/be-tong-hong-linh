import { PartialType } from '@nestjs/swagger'
import { CreateDefaultAccountDto } from './create-default-account.dto'

export class UpdateDefaultAccountDto extends PartialType(CreateDefaultAccountDto) {}
