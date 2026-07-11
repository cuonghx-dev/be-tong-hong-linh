import { AccountNature } from '@app/shared'
import * as XLSX from 'xlsx'

export interface ParsedAccount {
  number: string
  name: string
  nature: AccountNature
  nameEn: string | null
  description: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_he_thong_tai_khoan_.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  number: ['Số tài khoản', 'Số hiệu tài khoản', 'Số hiệu TK', 'Số TK', 'Tài khoản'],
  name: ['Tên tài khoản', 'Tên TK'],
  nature: ['Tính chất'],
  nameEn: ['Tên tiếng Anh'],
  description: ['Diễn giải'],
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

// "Dư Có" → Credit, "Lưỡng tính" → Dual, còn lại (kể cả "Dư Nợ") → Debit.
function natureFromText(text: string | null): AccountNature {
  const t = (text ?? '').toLowerCase()
  if (t.includes('lưỡng')) return AccountNature.Dual
  if (t.includes('có')) return AccountNature.Credit
  return AccountNature.Debit
}

// Parse file xlsx hệ thống tài khoản → danh sách tài khoản.
export function parseAccountXlsx(buffer: Buffer): ParsedAccount[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn "số tài khoản" (không phân biệt hoa/thường).
  const numberNorm = COL.number.map(normalize)
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => numberNorm.includes(normalize(toStr(c) ?? ''))),
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

  const iNumber = idx(COL.number)
  const iName = idx(COL.name)
  const iNature = idx(COL.nature)
  const iNameEn = idx(COL.nameEn)
  const iDescription = idx(COL.description)
  const iStatus = idx(COL.status)

  const out: ParsedAccount[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const number = iNumber >= 0 ? toStr(r[iNumber]) : null
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!number || !name) continue // bỏ dòng thiếu số TK hoặc tên

    out.push({
      number,
      name,
      nature: natureFromText(iNature >= 0 ? toStr(r[iNature]) : null),
      nameEn: iNameEn >= 0 ? toStr(r[iNameEn]) : null,
      description: iDescription >= 0 ? toStr(r[iDescription]) : null,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
