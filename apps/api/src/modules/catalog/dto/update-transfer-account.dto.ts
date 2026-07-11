import { PartialType } from '@nestjs/swagger'
import { CreateTransferAccountDto } from './create-transfer-account.dto'

export class UpdateTransferAccountDto extends PartialType(CreateTransferAccountDto) {}
