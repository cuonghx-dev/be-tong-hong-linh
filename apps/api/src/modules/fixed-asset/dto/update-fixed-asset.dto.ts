import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateFixedAssetDto } from './create-fixed-asset.dto'

// Sửa thẻ — không cho đổi mã tài sản (code) sau khi tạo.
export class UpdateFixedAssetDto extends PartialType(
  OmitType(CreateFixedAssetDto, ['code'] as const),
) {}
