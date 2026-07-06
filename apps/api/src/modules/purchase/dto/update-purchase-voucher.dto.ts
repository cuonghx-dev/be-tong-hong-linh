import { OmitType, PartialType } from '@nestjs/swagger'
import { CreatePurchaseVoucherDto } from './create-purchase-voucher.dto'

// Sửa chứng từ — không cho đổi loại chứng từ (type) sau khi tạo.
export class UpdatePurchaseVoucherDto extends PartialType(
  OmitType(CreatePurchaseVoucherDto, ['type'] as const),
) {}
