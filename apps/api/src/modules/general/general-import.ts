import * as XLSX from 'xlsx'

export interface ParsedGeneralVoucher {
  voucherNo: string
  postingDate: Date
  voucherDate: Date
  description: string | null
  amount: number
  branchId: string | null
}

// Tên cột cần tìm trong header (theo file MISA Chung_tu_nghiep_vu_khac.xlsx).
const COL = {
  voucherNo: 'Số chứng từ',
  postingDate: 'Ngày hạch toán',
  voucherDate: 'Ngày chứng từ',
  description: 'Diễn giải',
  amount: 'Số tiền',
  branch: 'Chi nhánh',
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

// SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (như cash-import).
function toDate(v: unknown): Date {
  const parsed = v instanceof Date ? v : new Date(String(v))
  const DAY = 86_400_000
  return Number.isNaN(parsed.getTime())
    ? new Date()
    : new Date(Math.round(parsed.getTime() / DAY) * DAY)
}

// Parse file xlsx chứng từ nghiệp vụ khác → danh sách chứng từ.
export function parseGeneralXlsx(buffer: Buffer): ParsedGeneralVoucher[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa "Số chứng từ".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.voucherNo))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iNo = idx(COL.voucherNo)
  const iPostingDate = idx(COL.postingDate)
  const iVoucherDate = idx(COL.voucherDate)
  const iDesc = idx(COL.description)
  const iAmount = idx(COL.amount)
  const iBranch = idx(COL.branch)

  const out: ParsedGeneralVoucher[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = toStr(r[iNo])
    if (!voucherNo) continue
    const postingDate = toDate(r[iPostingDate])
    out.push({
      voucherNo,
      postingDate,
      voucherDate: iVoucherDate >= 0 && r[iVoucherDate] != null ? toDate(r[iVoucherDate]) : postingDate,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      amount: toNumber(r[iAmount]),
      branchId: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
