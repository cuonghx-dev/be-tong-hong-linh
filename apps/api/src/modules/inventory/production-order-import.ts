import { ProductionOrderStatus } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedProductionOrder {
  voucherNo: string
  date: Date
  description: string | null
  receiptComplete: boolean
  issueComplete: boolean
  status: ProductionOrderStatus
  branchName: string | null
}

// Tên cột cần tìm trong header (mẫu Lenh_san_xuat.xlsx).
const COL = {
  date: 'Ngày',
  voucherNo: 'Số lệnh',
  description: 'Diễn giải',
  receiptComplete: 'Đã lập đủ PN',
  issueComplete: 'Đã lập đủ PX',
  status: 'Tình trạng',
  branch: 'Chi nhánh',
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// Ô "đã lập đủ" đánh dấu bằng ký tự ✓/x/true.
function toBool(v: unknown): boolean {
  const s = toStr(v)?.toLowerCase()
  if (!s) return false
  return s === '✓' || s === 'x' || s === 'true' || s === 'có' || s === '1'
}

// Tình trạng suy từ text cột "Tình trạng".
function statusFromText(text: string | null): ProductionOrderStatus {
  const s = text?.toLowerCase() ?? ''
  if (s.includes('hoàn thành')) return ProductionOrderStatus.COMPLETED
  if (s.includes('chưa')) return ProductionOrderStatus.NOT_STARTED
  return ProductionOrderStatus.IN_PROGRESS
}

// Parse file xlsx danh sách lệnh sản xuất (mức tổng hợp, không có dòng chi tiết) → danh sách lệnh.
export function parseProductionOrderXlsx(buffer: Buffer): ParsedProductionOrder[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa "Số lệnh".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.voucherNo))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iDate = idx(COL.date)
  const iNo = idx(COL.voucherNo)
  const iDesc = idx(COL.description)
  const iPn = idx(COL.receiptComplete)
  const iPx = idx(COL.issueComplete)
  const iStatus = idx(COL.status)
  const iBranch = idx(COL.branch)

  const DAY = 86_400_000
  const out: ParsedProductionOrder[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = iNo >= 0 ? toStr(r[iNo]) : null
    if (!voucherNo) continue // bỏ dòng tổng cộng / trống

    const rawDate = iDate >= 0 ? r[iDate] : null
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (như receipt-import).
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    out.push({
      voucherNo,
      date,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      receiptComplete: iPn >= 0 ? toBool(r[iPn]) : false,
      issueComplete: iPx >= 0 ? toBool(r[iPx]) : false,
      status: statusFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
      branchName: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
