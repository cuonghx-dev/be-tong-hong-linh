import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateBankVoucherDto } from './create-bank-voucher.dto'

// Sửa chứng từ — không cho đổi loại chứng từ (type) sau khi tạo.
export class UpdateBankVoucherDto extends PartialType(
  OmitType(CreateBankVoucherDto, ['type'] as const),
) {}
