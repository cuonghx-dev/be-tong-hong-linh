import { BankVoucherCategory, BankVoucherType } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedBankVoucher {
  voucherNo: string
  type: BankVoucherType
  category: BankVoucherCategory
  date: Date
  partnerName: string | null
  bankAccountNo: string | null
  reason: string | null
  description: string | null
  amount: number
  branchId: string | null
}

// Map cột "Loại chứng từ" (§5) → enum.
const CATEGORY_MAP: Record<string, BankVoucherCategory> = {
  'Thu tiền gửi': BankVoucherCategory.RECEIPT,
  'Ủy nhiệm chi': BankVoucherCategory.PAYMENT,
}

// Tên cột cần tìm trong header.
const COL = {
  voucherNo: 'Số chứng từ',
  date: 'Ngày hạch toán',
  description: 'Diễn giải',
  amount: 'Số tiền',
  partner: 'Đối tượng',
  bankAccountNo: 'Số tài khoản NH',
  reason: 'Lý do thu/chi',
  category: 'Loại chứng từ',
  branch: 'Chi nhánh',
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

// Parse file xlsx thu/chi tiền gửi → danh sách chứng từ.
export function parseBankXlsx(buffer: Buffer): ParsedBankVoucher[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa "Số chứng từ".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.voucherNo))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iNo = idx(COL.voucherNo)
  const iDate = idx(COL.date)
  const iDesc = idx(COL.description)
  const iAmount = idx(COL.amount)
  const iPartner = idx(COL.partner)
  const iBank = idx(COL.bankAccountNo)
  const iReason = idx(COL.reason)
  const iCategory = idx(COL.category)
  const iBranch = idx(COL.branch)

  const out: ParsedBankVoucher[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = toStr(r[iNo])
    if (!voucherNo) continue
    // Prefix NTTK → thu; còn lại (UNC…) → chi.
    const type = voucherNo.startsWith('NTTK')
      ? BankVoucherType.RECEIPT
      : BankVoucherType.PAYMENT
    const catText = toStr(r[iCategory]) ?? ''
    const category =
      CATEGORY_MAP[catText] ??
      (type === BankVoucherType.RECEIPT
        ? BankVoucherCategory.RECEIPT
        : BankVoucherCategory.PAYMENT)
    const rawDate = r[iDate]
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // Dòng footer ("Cộng"…) có chữ ở cột số chứng từ nhưng không có ngày → bỏ qua,
    // không được default ngày hiện tại (từng sinh chứng từ rác 8,9 tỷ).
    if (Number.isNaN(parsed.getTime())) continue
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất.
    const DAY = 86_400_000
    const date = new Date(Math.round(parsed.getTime() / DAY) * DAY)

    out.push({
      voucherNo,
      type,
      category,
      date,
      partnerName: iPartner >= 0 ? toStr(r[iPartner]) : null,
      bankAccountNo: iBank >= 0 ? toStr(r[iBank]) : null,
      reason: iReason >= 0 ? toStr(r[iReason]) : null,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      amount: toNumber(r[iAmount]),
      branchId: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
