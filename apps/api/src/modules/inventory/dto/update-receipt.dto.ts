import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateInventoryReceiptDto } from './create-receipt.dto'

// Sửa phiếu — không cho đổi loại chứng từ (receiptType) sau khi tạo.
export class UpdateInventoryReceiptDto extends PartialType(
  OmitType(CreateInventoryReceiptDto, ['receiptType'] as const),
) {}
