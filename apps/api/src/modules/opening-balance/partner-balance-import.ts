import * as XLSX from 'xlsx'

export interface ParsedPartnerBalance {
  partnerCode: string
  amount: number // Số còn phải thu/phải trả — số âm nghĩa là dư ngược vế (vd KH trả trước)
}

// Tên cột cần tìm trong header (theo file MISA Danh_sach_cong_no_khach_hang.xlsx và biến thể NCC).
const CODE_COLS = ['Mã khách hàng', 'Mã nhà cung cấp']
const AMOUNT_COLS = ['Số còn phải thu', 'Số còn phải trả', 'Số tiền nợ']

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

// Parse file xlsx danh sách công nợ khách hàng/NCC → danh sách {mã đối tượng, số còn phải thu/trả}.
export function parsePartnerBalanceXlsx(buffer: Buffer): ParsedPartnerBalance[] {
  const wb = XLSX.read(buffer)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa cột mã đối tượng ("Mã khách hàng" / "Mã nhà cung cấp").
  const headerIdx = rows.findIndex((r) => r.some((c) => CODE_COLS.includes(toStr(c) ?? '')))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const firstIdx = (names: string[]) => {
    for (const name of names) {
      const i = header.indexOf(name)
      if (i >= 0) return i
    }
    return -1
  }

  // So khớp tên cột chính xác nên "Số còn phải thu" không nhầm với "Số còn phải thu theo HĐ".
  const iCode = firstIdx(CODE_COLS)
  const iAmount = firstIdx(AMOUNT_COLS)
  if (iAmount < 0) return []

  const out: ParsedPartnerBalance[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const partnerCode = toStr(r[iCode])
    if (!partnerCode) continue
    out.push({ partnerCode, amount: toNumber(r[iAmount]) })
  }
  return out
}
