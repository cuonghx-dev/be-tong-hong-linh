import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateCashVoucherDto } from './create-cash-voucher.dto'

// Sửa phiếu — không cho đổi loại chứng từ (type) sau khi tạo.
export class UpdateCashVoucherDto extends PartialType(
  OmitType(CreateCashVoucherDto, ['type'] as const),
) {}
