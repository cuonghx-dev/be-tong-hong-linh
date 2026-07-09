import { PartialType } from '@nestjs/swagger'
import { CreateDisposalDto } from './create-disposal.dto'

// Sửa chứng từ ghi giảm — mọi trường optional (giữ nguyên nếu không truyền).
export class UpdateDisposalDto extends PartialType(CreateDisposalDto) {}
