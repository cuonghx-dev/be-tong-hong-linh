import { InvoiceIssueStatus } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedInvoice {
  invoiceNo: string
  invoiceType: string | null
  status: string | null
  customerName: string | null
  totalAmount: number
  issueStatus: InvoiceIssueStatus
  taxAuthorityCode: string | null
  sendStatus: string | null
  customerReceived: boolean
  date: Date
}

// Tên cột trong file xuất "Hóa đơn" (khớp header bảng danh sách HĐ).
const COL = {
  date: 'Ngày hóa đơn',
  invoiceNo: 'Số hóa đơn',
  type: 'Loại',
  status: 'TT hóa đơn',
  customer: 'Khách hàng',
  amount: 'Giá trị hóa đơn',
  issue: 'TT phát hành hóa đơn',
  taxCode: 'Mã của CQT',
  send: 'TT gửi hóa đơn',
  received: 'KH đã nhận hóa đơn',
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

// Parse file xlsx hóa đơn → danh sách hóa đơn (header-only, khóa theo Số hóa đơn).
export function parseInvoiceXlsx(buffer: Buffer): ParsedInvoice[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa "Số hóa đơn".
  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.invoiceNo))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iNo = idx(COL.invoiceNo)
  const iDate = idx(COL.date)
  const iType = idx(COL.type)
  const iStatus = idx(COL.status)
  const iCustomer = idx(COL.customer)
  const iAmount = idx(COL.amount)
  const iIssue = idx(COL.issue)
  const iTaxCode = idx(COL.taxCode)
  const iSend = idx(COL.send)
  const iReceived = idx(COL.received)

  const DAY = 86_400_000
  const out: ParsedInvoice[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const invoiceNo = iNo >= 0 ? toStr(r[iNo]) : null
    if (!invoiceNo) continue

    const rawDate = iDate >= 0 ? r[iDate] : null
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất.
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    const issueText = iIssue >= 0 ? toStr(r[iIssue]) : null
    const receivedText = iReceived >= 0 ? toStr(r[iReceived]) : null

    out.push({
      invoiceNo,
      invoiceType: iType >= 0 ? toStr(r[iType]) : null,
      status: iStatus >= 0 ? toStr(r[iStatus]) : null,
      customerName: iCustomer >= 0 ? toStr(r[iCustomer]) : null,
      totalAmount: iAmount >= 0 ? toNumber(r[iAmount]) : 0,
      issueStatus:
        !!issueText && issueText.includes('Đã cấp mã')
          ? InvoiceIssueStatus.CODE_ISSUED
          : InvoiceIssueStatus.UNISSUED,
      taxAuthorityCode: iTaxCode >= 0 ? toStr(r[iTaxCode]) : null,
      sendStatus: iSend >= 0 ? toStr(r[iSend]) : null,
      customerReceived: !!receivedText && receivedText.includes('Đã'),
      date,
    })
  }
  return out
}
