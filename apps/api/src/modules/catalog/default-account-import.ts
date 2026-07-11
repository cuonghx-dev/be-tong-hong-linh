import * as XLSX from 'xlsx'

export interface ParsedDefaultAccount {
  order: number
  name: string
  debitAccount: string | null
  creditAccount: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_tai_khoan_ngam_dinh.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  order: ['STT', 'Thứ tự'],
  name: ['Loại', 'Loại nghiệp vụ'],
  debit: ['TK Nợ', 'Tài khoản Nợ'],
  credit: ['TK Có', 'Tài khoản Có'],
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

// Parse file xlsx danh mục tài khoản ngầm định → danh sách loại nghiệp vụ + định khoản gợi ý.
export function parseDefaultAccountXlsx(buffer: Buffer): ParsedDefaultAccount[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn cột "Loại" (không phân biệt hoa/thường).
  const nameNorm = COL.name.map(normalize)
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => nameNorm.includes(normalize(toStr(c) ?? ''))),
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
  const iName = idx(COL.name)
  const iDebit = idx(COL.debit)
  const iCredit = idx(COL.credit)
  const iStatus = idx(COL.status)

  const out: ParsedDefaultAccount[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!name) continue // bỏ dòng thiếu loại nghiệp vụ

    out.push({
      order: (iOrder >= 0 ? toInt(r[iOrder]) : null) ?? out.length + 1,
      name,
      debitAccount: iDebit >= 0 ? toStr(r[iDebit]) : null,
      creditAccount: iCredit >= 0 ? toStr(r[iCredit]) : null,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
