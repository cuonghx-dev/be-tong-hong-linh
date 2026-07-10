import * as XLSX from 'xlsx'

export interface ParsedAccountBalance {
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
}

// Tên cột cần tìm trong header (theo file MISA Danh_sach_so_du_tai_khoan.xlsx).
const COL = {
  accountCode: 'Số tài khoản',
  accountName: 'Tên tài khoản',
  debit: 'Dư Nợ',
  credit: 'Dư Có',
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

// Parse file xlsx danh sách số dư tài khoản → danh sách dòng số dư.
export function parseAccountBalanceXlsx(buffer: Buffer): ParsedAccountBalance[] {
  const wb = XLSX.read(buffer)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa "Số tài khoản".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.accountCode))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iCode = idx(COL.accountCode)
  const iName = idx(COL.accountName)
  const iDebit = idx(COL.debit)
  const iCredit = idx(COL.credit)

  const out: ParsedAccountBalance[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const accountCode = toStr(r[iCode])
    if (!accountCode) continue
    out.push({
      accountCode,
      accountName: (iName >= 0 ? toStr(r[iName]) : null) ?? '',
      debitAmount: iDebit >= 0 ? toNumber(r[iDebit]) : 0,
      creditAmount: iCredit >= 0 ? toNumber(r[iCredit]) : 0,
    })
  }
  return out
}
