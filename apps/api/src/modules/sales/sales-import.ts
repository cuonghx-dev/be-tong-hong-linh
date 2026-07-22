import { SalesPaymentMode, SalesVoucherType } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedSales {
  voucherNo: string
  invoiceNo: string | null
  type: SalesVoucherType
  date: Date
  customerName: string | null
  totalPayment: number
  withInvoice: boolean
  paymentMode: SalesPaymentMode
  isInventoryIssue: boolean
  branchId: string | null
}

// Tên cột cần tìm trong header (mẫu Ban_hang.xlsx).
const COL = {
  voucherNo: 'Số chứng từ',
  invoiceNo: 'Số hóa đơn',
  date: 'Ngày hạch toán',
  customer: 'Khách hàng',
  totalPayment: 'Tổng tiền thanh toán',
  invoiceStatus: 'TT lập hóa đơn',
  payment: 'TT thanh toán',
  issue: 'TT xuất hàng',
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

// Parse file xlsx chứng từ bán hàng (mức tổng hợp, không có dòng hàng) → danh sách chứng từ.
export function parseSalesXlsx(buffer: Buffer): ParsedSales[] {
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
  const iInvoiceNo = idx(COL.invoiceNo)
  const iDate = idx(COL.date)
  const iCustomer = idx(COL.customer)
  const iPayment = idx(COL.totalPayment)
  const iInvoiceStatus = idx(COL.invoiceStatus)
  const iPayStatus = idx(COL.payment)
  const iIssue = idx(COL.issue)
  const iBranch = idx(COL.branch)

  const DAY = 86_400_000
  const out: ParsedSales[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = toStr(r[iNo])
    if (!voucherNo) continue

    const rawDate = r[iDate]
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (như purchase-import).
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    const invoiceText = iInvoiceStatus >= 0 ? toStr(r[iInvoiceStatus]) : null
    const payText = iPayStatus >= 0 ? toStr(r[iPayStatus]) : null
    const issueText = iIssue >= 0 ? toStr(r[iIssue]) : null

    out.push({
      voucherNo,
      invoiceNo: iInvoiceNo >= 0 ? toStr(r[iInvoiceNo]) : null,
      type: SalesVoucherType.DOMESTIC_GOODS,
      date,
      customerName: iCustomer >= 0 ? toStr(r[iCustomer]) : null,
      totalPayment: iPayment >= 0 ? toNumber(r[iPayment]) : 0,
      withInvoice: !!invoiceText && invoiceText.includes('Đã lập'),
      paymentMode:
        !!payText && payText.includes('Đã thanh toán')
          ? SalesPaymentMode.PAID_NOW
          : SalesPaymentMode.UNPAID,
      isInventoryIssue: !!issueText && issueText.includes('Đã xuất'),
      branchId: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
