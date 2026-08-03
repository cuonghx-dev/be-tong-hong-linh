import * as XLSX from 'xlsx'

export interface ParsedBankAccountBalance {
  accountNumber: string
  debit: number
  credit: number
}

// Tên cột cần tìm trong header (theo file MISA số dư tài khoản ngân hàng và biến thể).
// "Số tài khoản" để cuối: file MISA có cả cột "Số TK ngân hàng" (số TK thật) lẫn
// "Số tài khoản" (mã TK kế toán 112x) — phải ưu tiên cột số TK ngân hàng.
const CODE_COLS = [
  'Số TK ngân hàng',
  'Số tài khoản ngân hàng',
  'Số hiệu tài khoản',
  'Số TK',
  'Số tài khoản',
]
const DEBIT_COLS = ['Dư Nợ', 'Số dư Nợ', 'Dư nợ đầu kỳ', 'Số dư nợ đầu kỳ']
const CREDIT_COLS = ['Dư Có', 'Số dư Có', 'Dư có đầu kỳ', 'Số dư có đầu kỳ']
// Cột số dư gộp 1 giá trị (dương → Dư Nợ, âm → Dư Có) khi file không tách Nợ/Có.
const AMOUNT_COLS = ['Số dư', 'Số dư đầu kỳ', 'Số dư tài khoản']

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

// Parse file xlsx số dư tài khoản ngân hàng → danh sách {số tài khoản, Dư Nợ, Dư Có}.
export function parseBankAccountBalanceXlsx(buffer: Buffer): ParsedBankAccountBalance[] {
  const wb = XLSX.read(buffer)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa cột số tài khoản ngân hàng.
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

  const iCode = firstIdx(CODE_COLS)
  const iDebit = firstIdx(DEBIT_COLS)
  const iCredit = firstIdx(CREDIT_COLS)
  const iAmount = firstIdx(AMOUNT_COLS)
  // Không có cột số tiền nào → không đọc được.
  if (iDebit < 0 && iCredit < 0 && iAmount < 0) return []

  const out: ParsedBankAccountBalance[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const accountNumber = toStr(r[iCode])
    if (!accountNumber) continue
    if (iDebit >= 0 || iCredit >= 0) {
      out.push({
        accountNumber,
        debit: iDebit >= 0 ? toNumber(r[iDebit]) : 0,
        credit: iCredit >= 0 ? toNumber(r[iCredit]) : 0,
      })
    } else {
      // Cột số dư gộp: dương → Dư Nợ, âm → Dư Có.
      const amount = toNumber(r[iAmount])
      out.push({
        accountNumber,
        debit: amount > 0 ? amount : 0,
        credit: amount < 0 ? -amount : 0,
      })
    }
  }
  return out
}
