import { PartialType } from '@nestjs/swagger'
import { CreateGeneralVoucherDto } from './create-general-voucher.dto'

export class UpdateGeneralVoucherDto extends PartialType(CreateGeneralVoucherDto) {}
