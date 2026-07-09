// Type request/response phân hệ Tài sản cố định (06-tscd) — dùng chung FE ↔ BE.
import type { FixedAssetStatus } from '../enums'

// Thẻ tài sản cố định (1 dòng Sổ tài sản / 1 chứng từ Ghi tăng).
export interface FixedAssetDto {
  id: string
  voucherNo: string | null // Số chứng từ ghi tăng (vd GTTS05/2026) — tự sinh
  code: string // Mã tài sản
  name: string // Tên tài sản
  assetType: string | null // Loại tài sản
  department: string | null // Đơn vị sử dụng
  description: string | null // Diễn giải
  attachmentCount: number // Kèm theo (chứng từ gốc)
  increaseDate: string | null // Ngày ghi tăng (ISO date-only)
  depreciationStartDate: string | null // Ngày bắt đầu tính KH (ISO date-only)
  usefulLifeMonths: number // Thời gian sử dụng (tháng)
  remainingMonths: number // Thời gian sử dụng còn lại (tháng)
  originalCost: string // Nguyên giá (Decimal → string)
  depreciableValue: string // Giá trị tính KH
  accumulatedDepreciation: string // Hao mòn lũy kế
  residualValue: string // Giá trị còn lại
  monthlyDepreciation: string // Giá trị KH tháng
  costAccount: string | null // TK nguyên giá (2111x)
  depreciationAccount: string | null // TK khấu hao (2141)
  status: FixedAssetStatus // Tình trạng sử dụng
  createdAt: string
  updatedAt: string
}

// Payload tạo/sửa thẻ tài sản.
export interface CreateFixedAssetInput {
  code: string
  name: string
  assetType?: string | null
  department?: string | null
  description?: string | null
  attachmentCount?: number
  increaseDate?: string | null
  depreciationStartDate?: string | null
  usefulLifeMonths?: number
  remainingMonths?: number
  originalCost?: number
  depreciableValue?: number
  accumulatedDepreciation?: number
  residualValue?: number
  monthlyDepreciation?: number
  costAccount?: string | null
  depreciationAccount?: string | null
  status?: FixedAssetStatus
}

// Sửa thẻ — không cho đổi mã tài sản (code) sau khi tạo.
export type UpdateFixedAssetInput = Partial<Omit<CreateFixedAssetInput, 'code'>>

// Tổng cộng toàn bộ danh sách (dòng "Tổng" cuối Sổ tài sản).
export interface FixedAssetTotals {
  usefulLifeMonths: number
  remainingMonths: number
  originalCost: string
  depreciableValue: string
  accumulatedDepreciation: string
  residualValue: string
  monthlyDepreciation: string
}

// Sắp xếp danh sách: theo mã tài sản (Sổ tài sản) hoặc ngày ghi tăng giảm dần (Ghi tăng).
export type FixedAssetOrderBy = 'code' | 'increaseDate'

// Tham số lọc Sổ tài sản cố định / Danh sách ghi tăng.
export interface FixedAssetFilter {
  page?: number
  pageSize?: number
  assetType?: string
  status?: FixedAssetStatus
  fromDate?: string // theo Ngày ghi tăng
  toDate?: string
  keyword?: string
  orderBy?: FixedAssetOrderBy
}

// ── Ghi giảm tài sản cố định (Danh sách ghi giảm) ─────────────────────────────

// 1 dòng ghi giảm — snapshot giá trị 1 tài sản bị ghi giảm.
export interface FixedAssetDisposalLineDto {
  id: string
  lineNo: number
  assetId: string | null // FK mềm tới thẻ TSCD
  assetCode: string | null // Mã tài sản
  assetName: string | null // Tên tài sản
  originalCost: string // Nguyên giá (Decimal → string)
  accumulatedDepreciation: string // Hao mòn lũy kế
  residualValue: string // Giá trị còn lại
  debitAccount: string | null // TK Nợ (2141 / 811)
  creditAccount: string | null // TK Có (211x)
}

// Chứng từ ghi giảm TSCD (1 dòng Danh sách ghi giảm).
export interface FixedAssetDisposalDto {
  id: string
  voucherNo: string // Số chứng từ (GGTS####/YYYY)
  postingDate: string // Ngày hạch toán (ISO date-only)
  voucherDate: string // Ngày chứng từ (ISO date-only)
  reason: string | null // Lý do ghi giảm
  totalOriginalCost: string // Tổng nguyên giá
  totalAccumulated: string // Tổng hao mòn lũy kế
  totalResidual: string // Tổng giá trị còn lại
  lines: FixedAssetDisposalLineDto[]
  createdAt: string
  updatedAt: string
}

// Payload dòng ghi giảm khi tạo/sửa.
export interface CreateFixedAssetDisposalLineInput {
  assetId?: string | null
  assetCode?: string | null
  assetName?: string | null
  originalCost?: number
  accumulatedDepreciation?: number
  residualValue?: number
  debitAccount?: string | null
  creditAccount?: string | null
}

// Payload tạo chứng từ ghi giảm.
export interface CreateFixedAssetDisposalInput {
  postingDate: string
  voucherDate: string
  reason?: string | null
  lines: CreateFixedAssetDisposalLineInput[]
}

// Sửa chứng từ ghi giảm — dùng lại toàn bộ payload tạo.
export type UpdateFixedAssetDisposalInput = Partial<CreateFixedAssetDisposalInput>

// Tham số lọc Danh sách ghi giảm.
export interface FixedAssetDisposalFilter {
  page?: number
  pageSize?: number
  fromDate?: string // theo Ngày hạch toán
  toDate?: string
  keyword?: string // số chứng từ / lý do
}
