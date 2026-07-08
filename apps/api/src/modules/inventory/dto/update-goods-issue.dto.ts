import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateGoodsIssueDto } from './create-goods-issue.dto'

// Sửa phiếu — không cho đổi lý do xuất (category) sau khi tạo.
export class UpdateGoodsIssueDto extends PartialType(
  OmitType(CreateGoodsIssueDto, ['category'] as const),
) {}
