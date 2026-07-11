import * as XLSX from 'xlsx'

export interface ParsedBank {
  shortName: string
  fullName: string
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_ngan_hang.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  shortName: ['Tên viết tắt', 'Viết tắt'],
  fullName: ['Tên đầy đủ', 'Tên ngân hàng'],
  status: ['Trạng thái'],
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// Chuẩn hóa header để so khớp: bỏ khoảng trắng thừa + hạ chữ thường.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// "Ngừng sử dụng" → false; còn lại (kể cả thiếu cột) coi là đang sử dụng.
function activeFromText(text: string | null): boolean {
  return !(text && text.toLowerCase().includes('ngừng'))
}

// Parse file xlsx danh mục ngân hàng → danh sách ngân hàng.
export function parseBankXlsx(buffer: Buffer): ParsedBank[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn "tên viết tắt" (không phân biệt hoa/thường).
  const shortNorm = COL.shortName.map(normalize)
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => shortNorm.includes(normalize(toStr(c) ?? ''))),
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

  const iShort = idx(COL.shortName)
  const iFull = idx(COL.fullName)
  const iStatus = idx(COL.status)

  const out: ParsedBank[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const shortName = iShort >= 0 ? toStr(r[iShort]) : null
    const fullName = iFull >= 0 ? toStr(r[iFull]) : null
    if (!shortName || !fullName) continue // bỏ dòng thiếu tên viết tắt hoặc tên đầy đủ

    out.push({
      shortName,
      fullName,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
