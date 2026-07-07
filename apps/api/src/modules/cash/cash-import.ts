import { CashVoucherCategory, CashVoucherType } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedVoucher {
  voucherNo: string
  type: CashVoucherType
  category: CashVoucherCategory
  date: Date
  partnerName: string | null
  reason: string | null
  description: string | null
  amount: number
  branchId: string | null
}

// Map cột "Loại chứng từ" (§5) → enum.
const CATEGORY_MAP: Record<string, CashVoucherCategory> = {
  'Bán hàng hóa trong nước - Tiền mặt': CashVoucherCategory.SALES_CASH,
  'Phiếu thu': CashVoucherCategory.RECEIPT,
  'Rút tiền gửi về nhập quỹ': CashVoucherCategory.RECEIPT_BANK_WITHDRAW,
  'Thu hoàn ứng nhân viên': CashVoucherCategory.RECEIPT_EMPLOYEE_ADVANCE,
  'Thu tiền khách hàng (không theo hóa đơn)': CashVoucherCategory.RECEIPT_CUSTOMER,
  'Thu khác': CashVoucherCategory.RECEIPT,
  'Thu hồi các khoản cho vay': CashVoucherCategory.RECEIPT_LOAN_RECOVERY,
  'Phiếu chi': CashVoucherCategory.PAYMENT,
  'Tạm ứng cho nhân viên': CashVoucherCategory.PAYMENT_EMPLOYEE_ADVANCE,
  'Chi khác': CashVoucherCategory.PAYMENT,
  'Gửi tiền vào ngân hàng': CashVoucherCategory.DEPOSIT_TO_BANK,
  'Trả tiền nhà cung cấp (không theo hóa đơn)': CashVoucherCategory.PAYMENT_SUPPLIER,
  'Chi mua ngoài có hóa đơn': CashVoucherCategory.PAYMENT_PURCHASE_WITH_INVOICE,
  'Trả lương tạm ứng cho nhân viên': CashVoucherCategory.PAYMENT_SALARY_ADVANCE,
  'Trả lương nhân viên': CashVoucherCategory.PAYMENT_SALARY,
  'Chuyển tiền cho chi nhánh khác': CashVoucherCategory.PAYMENT_TO_BRANCH,
  'Chi cho vay': CashVoucherCategory.PAYMENT_LOAN,
  'Nộp thuế TNDN tạm tính': CashVoucherCategory.PAYMENT_CIT_TAX,
  'Chứng từ mua dịch vụ - Tiền mặt': CashVoucherCategory.PURCHASE_SERVICE_CASH,
  'Mua hàng trong nước không qua kho - Tiền mặt': CashVoucherCategory.PURCHASE_GOODS_CASH,
}

// Tên cột cần tìm trong header.
const COL = {
  voucherNo: 'Số chứng từ',
  date: 'Ngày hạch toán',
  description: 'Diễn giải',
  amount: 'Số tiền',
  partner: 'Đối tượng',
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

// Parse file xlsx thu/chi tiền mặt → danh sách phiếu.
export function parseCashXlsx(buffer: Buffer): ParsedVoucher[] {
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
  const iReason = idx(COL.reason)
  const iCategory = idx(COL.category)
  const iBranch = idx(COL.branch)

  const out: ParsedVoucher[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = toStr(r[iNo])
    if (!voucherNo) continue
    const type = voucherNo.startsWith('PT')
      ? CashVoucherType.RECEIPT
      : CashVoucherType.PAYMENT
    const catText = toStr(r[iCategory]) ?? ''
    const category =
      CATEGORY_MAP[catText] ??
      (type === CashVoucherType.RECEIPT
        ? CashVoucherCategory.RECEIPT
        : CashVoucherCategory.PAYMENT)
    const rawDate = r[iDate]
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm (vd 2026-07-05 → 2026-07-04T16:59:30Z).
    // Làm tròn về UTC-midnight gần nhất → date-only đúng, không lệch ngày.
    const DAY = 86_400_000
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    out.push({
      voucherNo,
      type,
      category,
      date,
      partnerName: iPartner >= 0 ? toStr(r[iPartner]) : null,
      reason: iReason >= 0 ? toStr(r[iReason]) : null,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      amount: toNumber(r[iAmount]),
      branchId: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
