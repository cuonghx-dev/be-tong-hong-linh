import * as XLSX from 'xlsx'

export interface ParsedCustomer {
  code: string
  name: string
  address: string | null
  taxCode: string | null
  phone: string | null
}

// Tên cột trong file danh mục khách hàng (khớp header bảng danh sách KH).
// Mỗi trường nhận nhiều biến thể tên cột để linh hoạt với file MISA.
const COL = {
  code: ['Mã khách hàng', 'Mã KH'],
  name: ['Tên khách hàng', 'Tên'],
  address: ['Địa chỉ'],
  taxCode: ['Mã số thuế/CCCD chủ hộ', 'Mã số thuế', 'MST'],
  phone: ['Điện thoại', 'Số điện thoại'],
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// Parse file xlsx danh mục khách hàng → danh sách KH (khóa theo Mã khách hàng).
export function parseCustomerXlsx(buffer: Buffer): ParsedCustomer[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa 1 trong các tên cột "Mã khách hàng".
  const headerIdx = rows.findIndex((r) => r.some((c) => COL.code.includes(toStr(c) ?? '')))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h))

  const iCode = idx(COL.code)
  const iName = idx(COL.name)
  const iAddress = idx(COL.address)
  const iTaxCode = idx(COL.taxCode)
  const iPhone = idx(COL.phone)

  const out: ParsedCustomer[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = iCode >= 0 ? toStr(r[iCode]) : null
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!code || !name) continue

    out.push({
      code,
      name,
      address: iAddress >= 0 ? toStr(r[iAddress]) : null,
      taxCode: iTaxCode >= 0 ? toStr(r[iTaxCode]) : null,
      phone: iPhone >= 0 ? toStr(r[iPhone]) : null,
    })
  }
  return out
}
