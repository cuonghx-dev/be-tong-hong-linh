import { FixedAssetStatus } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedFixedAsset {
  voucherNo: string | null // Số chứng từ ghi tăng (chỉ có ở mẫu Danh_sach_ghi_tang)
  code: string
  name: string
  assetType: string | null
  department: string | null
  increaseDate: Date | null
  depreciationStartDate: Date | null
  usefulLifeMonths: number
  remainingMonths: number
  originalCost: number
  depreciableValue: number
  accumulatedDepreciation: number
  residualValue: number
  monthlyDepreciation: number
  costAccount: string | null
  depreciationAccount: string | null
  status: FixedAssetStatus
}

// Tên cột cần tìm trong header (mẫu Danh_sach_so_tai_san / Danh_sach_ghi_tang).
const COL = {
  voucherNo: 'Số chứng từ',
  code: 'Mã tài sản',
  name: 'Tên tài sản',
  assetType: 'Loại tài sản',
  department: 'Đơn vị sử dụng',
  increaseDate: 'Ngày ghi tăng',
  depreciationStartDate: 'Ngày bắt đầu tính KH',
  usefulLife: 'Thời gian sử dụng (Tháng)',
  remaining: 'Thời gian sử dụng còn lại (Tháng)',
  originalCost: 'Nguyên giá',
  depreciableValue: 'Giá trị tính KH',
  accumulated: 'Hao mòn lũy kế',
  residual: 'Giá trị còn lại',
  monthly: 'Giá trị KH tháng',
  costAccount: 'TK nguyên giá',
  depreciationAccount: 'TK khấu hao',
  status: 'Tình trạng sử dụng',
}

const DAY = 86_400_000

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function toInt(v: unknown): number {
  return Math.trunc(toNumber(v))
}

// Serial/Date của Excel → Date UTC-midnight (SheetJS lệch giờ quanh nửa đêm → làm tròn).
function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  const parsed = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(Math.round(parsed.getTime() / DAY) * DAY)
}

// Tình trạng sử dụng suy từ text cột "Tình trạng sử dụng".
function statusFromText(text: string | null): FixedAssetStatus {
  return text?.toLowerCase().includes('ngừng')
    ? FixedAssetStatus.SUSPENDED
    : FixedAssetStatus.IN_USE
}

// Parse file xlsx Sổ tài sản cố định → danh sách thẻ tài sản.
export function parseFixedAssetXlsx(buffer: Buffer): ParsedFixedAsset[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa "Mã tài sản".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.code))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iVoucherNo = idx(COL.voucherNo)
  const iCode = idx(COL.code)
  const iName = idx(COL.name)
  const iType = idx(COL.assetType)
  const iDept = idx(COL.department)
  const iIncrease = idx(COL.increaseDate)
  const iDepStart = idx(COL.depreciationStartDate)
  const iUseful = idx(COL.usefulLife)
  const iRemaining = idx(COL.remaining)
  const iOriginal = idx(COL.originalCost)
  const iDepreciable = idx(COL.depreciableValue)
  const iAccumulated = idx(COL.accumulated)
  const iResidual = idx(COL.residual)
  const iMonthly = idx(COL.monthly)
  const iCostAcc = idx(COL.costAccount)
  const iDepAcc = idx(COL.depreciationAccount)
  const iStatus = idx(COL.status)

  const at = (r: unknown[], i: number) => (i >= 0 ? r[i] : null)

  // Từ khóa đánh dấu dòng tổng cộng cuối bảng (MISA đặt "Tổng" vào cột Mã tài sản).
  const TOTAL_LABELS = new Set(['tổng', 'tổng cộng', 'cộng', 'total'])

  const out: ParsedFixedAsset[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = toStr(at(r, iCode))
    const rawName = toStr(at(r, iName))
    // Bỏ dòng tổng cộng / trống: không có mã, không có tên, hoặc mã là nhãn "Tổng".
    if (!code || TOTAL_LABELS.has(code.toLowerCase()) || !rawName) continue

    out.push({
      voucherNo: toStr(at(r, iVoucherNo)),
      code,
      name: rawName,
      assetType: toStr(at(r, iType)),
      department: toStr(at(r, iDept)),
      increaseDate: toDate(at(r, iIncrease)),
      depreciationStartDate: toDate(at(r, iDepStart)),
      usefulLifeMonths: toInt(at(r, iUseful)),
      remainingMonths: toInt(at(r, iRemaining)),
      originalCost: toNumber(at(r, iOriginal)),
      depreciableValue: toNumber(at(r, iDepreciable)),
      accumulatedDepreciation: toNumber(at(r, iAccumulated)),
      residualValue: toNumber(at(r, iResidual)),
      monthlyDepreciation: toNumber(at(r, iMonthly)),
      costAccount: toStr(at(r, iCostAcc)),
      depreciationAccount: toStr(at(r, iDepAcc)),
      status: statusFromText(toStr(at(r, iStatus))),
    })
  }
  return out
}
