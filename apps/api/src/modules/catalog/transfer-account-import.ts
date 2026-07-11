import { TransferSide } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedTransferAccount {
  order: number
  code: string
  fromAccount: string
  toAccount: string
  side: TransferSide
  description: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_tai_khoan_ket_chuyen.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  order: ['Thứ tự kết chuyển', 'Thứ tự'],
  code: ['Mã kết chuyển', 'Mã'],
  from: ['Kết chuyển từ'],
  to: ['Kết chuyển đến'],
  side: ['Bên kết chuyển', 'Bên'],
  description: ['Diễn giải'],
  status: ['Trạng thái'],
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function toInt(v: unknown): number | null {
  const s = toStr(v)
  if (!s) return null
  const n = Number.parseInt(s.replace(/\D+/g, ''), 10)
  return Number.isNaN(n) ? null : n
}

// Chuẩn hóa header để so khớp: bỏ khoảng trắng thừa + hạ chữ thường.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// "Ngừng sử dụng" → false; còn lại (kể cả thiếu cột) coi là đang sử dụng.
function activeFromText(text: string | null): boolean {
  return !(text && text.toLowerCase().includes('ngừng'))
}

// Cột "Bên kết chuyển": Nợ / Có; không khớp (kể cả thiếu cột) → Hai bên.
function sideFromText(text: string | null): TransferSide {
  const t = text?.toLowerCase().trim() ?? ''
  if (t === 'nợ') return TransferSide.DEBIT
  if (t === 'có') return TransferSide.CREDIT
  return TransferSide.BOTH
}

// Parse file xlsx danh mục tài khoản kết chuyển → danh sách cấu hình kết chuyển.
export function parseTransferAccountXlsx(buffer: Buffer): ParsedTransferAccount[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn "mã kết chuyển" (không phân biệt hoa/thường).
  const codeNorm = COL.code.map(normalize)
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => codeNorm.includes(normalize(toStr(c) ?? ''))),
  )
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => normalize(toStr(c) ?? ''))
  // Trả về vị trí cột đầu tiên khớp bất kỳ tên nào trong danh sách.
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(normalize(n))
      if (i >= 0) return i
    }
    return -1
  }

  const iOrder = idx(COL.order)
  const iCode = idx(COL.code)
  const iFrom = idx(COL.from)
  const iTo = idx(COL.to)
  const iSide = idx(COL.side)
  const iDescription = idx(COL.description)
  const iStatus = idx(COL.status)

  const out: ParsedTransferAccount[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = iCode >= 0 ? toStr(r[iCode]) : null
    const fromAccount = iFrom >= 0 ? toStr(r[iFrom]) : null
    const toAccount = iTo >= 0 ? toStr(r[iTo]) : null
    if (!code || !fromAccount || !toAccount) continue // bỏ dòng thiếu mã / TK từ / TK đến

    out.push({
      order: (iOrder >= 0 ? toInt(r[iOrder]) : null) ?? out.length + 1,
      code,
      fromAccount,
      toAccount,
      side: sideFromText(iSide >= 0 ? toStr(r[iSide]) : null),
      description: iDescription >= 0 ? toStr(r[iDescription]) : null,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
