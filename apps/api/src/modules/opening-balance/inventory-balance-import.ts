import * as XLSX from 'xlsx'

export interface ParsedInventoryBalance {
  productCode: string // Mã hàng
  warehouseCode: string // Mã kho (có thể rỗng — dùng kho ngầm định của VTHH)
  quantity: number // Số lượng tồn
  amount: number // Giá trị tồn
}

// Tên cột cần tìm trong header (theo file MISA Danh_sach_ton_kho_vthh.xlsx).
const CODE_COL = 'Mã hàng'
const WAREHOUSE_COL = 'Mã kho'
const QUANTITY_COL = 'Số lượng tồn'
const AMOUNT_COL = 'Giá trị tồn'

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

// Parse file xlsx danh sách tồn kho VTHH → danh sách {mã hàng, mã kho, số lượng, giá trị}.
// Dòng "Tổng" cuối file không có Mã hàng nên tự bị loại.
export function parseInventoryBalanceXlsx(buffer: Buffer): ParsedInventoryBalance[] {
  const wb = XLSX.read(buffer)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa cột "Mã hàng".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === CODE_COL))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')

  const iCode = header.indexOf(CODE_COL)
  const iWarehouse = header.indexOf(WAREHOUSE_COL)
  const iQuantity = header.indexOf(QUANTITY_COL)
  const iAmount = header.indexOf(AMOUNT_COL)
  if (iQuantity < 0 && iAmount < 0) return []

  const out: ParsedInventoryBalance[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const productCode = toStr(r[iCode])
    if (!productCode) continue
    out.push({
      productCode,
      warehouseCode: iWarehouse >= 0 ? (toStr(r[iWarehouse]) ?? '') : '',
      quantity: iQuantity >= 0 ? toNumber(r[iQuantity]) : 0,
      amount: iAmount >= 0 ? toNumber(r[iAmount]) : 0,
    })
  }
  return out
}
