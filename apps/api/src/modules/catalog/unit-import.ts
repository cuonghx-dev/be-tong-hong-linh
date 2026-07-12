import * as XLSX from 'xlsx'

export interface ParsedUnit {
  name: string
  description: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_don_vi_tinh.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  name: ['Đơn vị tính', 'Tên'],
  description: ['Mô tả'],
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

// Parse file xlsx danh mục đơn vị tính → danh sách đơn vị tính.
export function parseUnitXlsx(buffer: Buffer): ParsedUnit[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn "đơn vị tính" (không phân biệt hoa/thường).
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

  const iName = idx(COL.name)
  const iDescription = idx(COL.description)
  const iStatus = idx(COL.status)

  const out: ParsedUnit[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!name) continue // bỏ dòng thiếu tên

    out.push({
      name,
      description: iDescription >= 0 ? toStr(r[iDescription]) : null,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
