import { SupplierType } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedSupplier {
  code: string
  name: string
  type: SupplierType
  taxCode: string | null
  budgetRelationCode: string | null
  phone: string | null
  website: string | null
  address: string | null
  debtAmount: number
  invoiceRisk: string | null
}

// Tên cột cần tìm trong header (mẫu Nha_cung_cap.xlsx). Chấp nhận vài biến thể.
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  code: ['Mã nhà cung cấp', 'Mã NCC', 'Mã'],
  name: ['Tên nhà cung cấp', 'Tên'],
  type: ['Loại', 'Loại NCC'],
  taxCode: ['Mã số thuế/CCCD chủ hộ', 'Mã số thuế/CCCD', 'Mã số thuế', 'MST'],
  budgetRelationCode: ['Mã số ĐVQHNS'],
  phone: ['Điện thoại', 'Số điện thoại', 'SĐT'],
  website: ['Website'],
  address: ['Địa chỉ'],
  debtAmount: ['Số tiền nợ', 'Công nợ', 'Nợ đầu kỳ'],
  invoiceRisk: ['Rủi ro về hóa đơn', 'Rủi ro hóa đơn'],
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

// Chuẩn hóa header để so khớp: bỏ khoảng trắng thừa + hạ chữ thường.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// Cá nhân nếu văn bản chứa "cá nhân"; còn lại coi là tổ chức.
function typeFromText(text: string | null): SupplierType {
  return text && text.toLowerCase().includes('cá nhân')
    ? SupplierType.INDIVIDUAL
    : SupplierType.ORG
}

// Parse file xlsx nhà cung cấp → danh sách NCC.
export function parseSupplierXlsx(buffer: Buffer): ParsedSupplier[] {
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
  const iType = idx(COL.type)
  const iTax = idx(COL.taxCode)
  const iBudget = idx(COL.budgetRelationCode)
  const iPhone = idx(COL.phone)
  const iWebsite = idx(COL.website)
  const iAddress = idx(COL.address)
  const iDebt = idx(COL.debtAmount)
  const iRisk = idx(COL.invoiceRisk)

  const out: ParsedSupplier[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = iCode >= 0 ? toStr(r[iCode]) : null
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!code || !name) continue // bỏ dòng thiếu mã hoặc tên

    out.push({
      code,
      name,
      type: typeFromText(iType >= 0 ? toStr(r[iType]) : null),
      taxCode: iTax >= 0 ? toStr(r[iTax]) : null,
      budgetRelationCode: iBudget >= 0 ? toStr(r[iBudget]) : null,
      phone: iPhone >= 0 ? toStr(r[iPhone]) : null,
      website: iWebsite >= 0 ? toStr(r[iWebsite]) : null,
      address: iAddress >= 0 ? toStr(r[iAddress]) : null,
      debtAmount: iDebt >= 0 ? toNumber(r[iDebt]) : 0,
      invoiceRisk: iRisk >= 0 ? toStr(r[iRisk]) : null,
    })
  }
  return out
}
