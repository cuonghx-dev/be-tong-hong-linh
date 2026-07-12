import * as XLSX from 'xlsx'

export interface ParsedProductGroup {
  code: string
  name: string
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_nhom_vat_tu_hang_hoa_dich_vu.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  code: ['Mã nhóm vật tư, hàng hóa, dịch vụ', 'Mã nhóm', 'Mã'],
  name: ['Tên nhóm vật tư, hàng hóa, dịch vụ', 'Tên nhóm', 'Tên'],
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

// Parse file xlsx nhóm VTHH → danh sách nhóm.
export function parseProductGroupXlsx(buffer: Buffer): ParsedProductGroup[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn "mã" (không phân biệt hoa/thường).
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

  const iCode = idx(COL.code)
  const iName = idx(COL.name)
  const iStatus = idx(COL.status)

  const out: ParsedProductGroup[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = iCode >= 0 ? toStr(r[iCode]) : null
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!code || !name) continue // bỏ dòng thiếu mã hoặc tên

    out.push({
      code,
      name,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
