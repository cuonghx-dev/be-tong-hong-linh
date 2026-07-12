import * as XLSX from 'xlsx'

export interface ParsedFixedAsset {
  code: string
  name: string
  assetType: string
  department: string
  originalCost: number
  depreciableValue: number
  accumulatedDepreciation: number
  acquisitionDate: Date
  depreciationDate: Date
  usefulLifeMonths: number
  remainingMonths: number
  assetAccount: string
  depreciationAccount: string
}

// Tên cột cần tìm trong header (theo file MISA Danh_sach_tai_san_co_dinh_dau_ky.xlsx).
const COL = {
  code: 'Mã tài sản',
  name: 'Tên tài sản',
  assetType: 'Loại tài sản',
  department: 'Đơn vị sử dụng',
  originalCost: 'Nguyên giá',
  depreciableValue: 'Giá trị tính KH',
  accumulatedDepreciation: 'Hao mòn lũy kế',
  acquisitionDate: 'Ngày ghi tăng',
  depreciationDate: 'Ngày tính KH',
  usefulLifeMonths: 'Thời gian SD (tháng)',
  remainingMonths: 'Thời gian SD còn lại (tháng)',
  assetAccount: 'TK nguyên giá',
  depreciationAccount: 'TK khấu hao',
}

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

const DAY = 24 * 60 * 60 * 1000

// Ngày trong file MISA là cell date (cellDates) — làm tròn về 0h UTC để lưu cột DATE.
function toDate(v: unknown): Date | null {
  const parsed = v instanceof Date ? v : new Date(String(v ?? ''))
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(Math.round(parsed.getTime() / DAY) * DAY)
}

// Parse file xlsx danh sách TSCĐ đầu kỳ → danh sách tài sản.
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

  const iCode = idx(COL.code)
  const iName = idx(COL.name)
  const iType = idx(COL.assetType)
  const iDept = idx(COL.department)
  const iCost = idx(COL.originalCost)
  const iDepreciable = idx(COL.depreciableValue)
  const iAccumulated = idx(COL.accumulatedDepreciation)
  const iAcqDate = idx(COL.acquisitionDate)
  const iDepDate = idx(COL.depreciationDate)
  const iLife = idx(COL.usefulLifeMonths)
  const iRemaining = idx(COL.remainingMonths)
  const iAssetAcc = idx(COL.assetAccount)
  const iDepAcc = idx(COL.depreciationAccount)

  const out: ParsedFixedAsset[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = toStr(r[iCode])
    const name = iName >= 0 ? toStr(r[iName]) : null
    // Dòng chân "Tổng" của MISA không có tên tài sản → bỏ qua.
    if (!code || !name) continue
    const acquisitionDate = iAcqDate >= 0 ? toDate(r[iAcqDate]) : null
    const depreciationDate = iDepDate >= 0 ? toDate(r[iDepDate]) : null
    if (!acquisitionDate) continue
    out.push({
      code,
      name,
      assetType: (iType >= 0 ? toStr(r[iType]) : null) ?? '',
      department: (iDept >= 0 ? toStr(r[iDept]) : null) ?? '',
      originalCost: iCost >= 0 ? toNumber(r[iCost]) : 0,
      depreciableValue: iDepreciable >= 0 ? toNumber(r[iDepreciable]) : 0,
      accumulatedDepreciation: iAccumulated >= 0 ? toNumber(r[iAccumulated]) : 0,
      acquisitionDate,
      depreciationDate: depreciationDate ?? acquisitionDate,
      usefulLifeMonths: iLife >= 0 ? toNumber(r[iLife]) : 0,
      remainingMonths: iRemaining >= 0 ? toNumber(r[iRemaining]) : 0,
      assetAccount: (iAssetAcc >= 0 ? toStr(r[iAssetAcc]) : null) ?? '',
      depreciationAccount: (iDepAcc >= 0 ? toStr(r[iDepAcc]) : null) ?? '',
    })
  }
  return out
}
