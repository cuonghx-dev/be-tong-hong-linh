import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateSalesVoucherDto } from './create-sales-voucher.dto'

// Sửa chứng từ — không cho đổi loại nghiệp vụ (voucherType) sau khi tạo.
export class UpdateSalesVoucherDto extends PartialType(
  OmitType(CreateSalesVoucherDto, ['voucherType'] as const),
) {}
