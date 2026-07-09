import { FixedAssetStatus } from '@app/shared'
import { z } from 'zod'

// Ghi tăng TSCD — mỗi chứng từ tạo 1 thẻ tài sản (Số chứng từ GTTS##/YYYY tự sinh).
// Giá trị còn lại + Giá trị KH tháng do server tính lại; form chỉ hiển thị xem trước.
export const assetIncreaseSchema = z.object({
  code: z.string().min(1, 'Nhập mã tài sản'),
  name: z.string().min(1, 'Nhập tên tài sản'),
  assetType: z.string().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  attachmentCount: z.coerce.number().int().min(0).optional(),
  increaseDate: z.string().min(1, 'Chọn ngày ghi tăng'),
  depreciationStartDate: z.string().optional(),
  usefulLifeMonths: z.coerce.number().int().min(0, 'Thời gian sử dụng ≥ 0'),
  originalCost: z.coerce.number().min(0, 'Nguyên giá ≥ 0'),
  depreciableValue: z.coerce.number().min(0, 'Giá trị tính KH ≥ 0').optional(),
  accumulatedDepreciation: z.coerce.number().min(0, 'Hao mòn lũy kế ≥ 0').optional(),
  costAccount: z.string().optional(),
  depreciationAccount: z.string().optional(),
  status: z.nativeEnum(FixedAssetStatus),
})

export type AssetIncreaseFormValues = z.infer<typeof assetIncreaseSchema>

// Dòng ghi giảm — 1 tài sản bị ghi giảm (snapshot nguyên giá/hao mòn/giá trị còn lại).
export const disposalLineSchema = z.object({
  assetId: z.string().optional(),
  assetCode: z.string().optional(),
  assetName: z.string().optional(),
  originalCost: z.coerce.number().min(0, 'Nguyên giá ≥ 0'),
  accumulatedDepreciation: z.coerce.number().min(0, 'Hao mòn ≥ 0'),
  residualValue: z.coerce.number().min(0, 'Giá trị còn lại ≥ 0'),
  debitAccount: z.string().optional(),
  creditAccount: z.string().optional(),
})

export const disposalSchema = z.object({
  postingDate: z.string().min(1, 'Chọn ngày hạch toán'),
  voucherDate: z.string().min(1, 'Chọn ngày chứng từ'),
  reason: z.string().optional(),
  lines: z.array(disposalLineSchema).min(1, 'Cần chọn ít nhất 1 tài sản ghi giảm'),
})

export type DisposalFormValues = z.infer<typeof disposalSchema>
export type DisposalLineFormValues = z.infer<typeof disposalLineSchema>
