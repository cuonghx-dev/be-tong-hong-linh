import { GoodsIssueCategory } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedGoodsIssue {
  voucherNo: string
  category: GoodsIssueCategory
  date: Date
  description: string | null
  totalAmount: number
  receiver: string | null
  salesDocStatus: string | null
  invoiceIssueStatus: string | null
  taxAuthorityCode: string | null
}

// Tên cột cần tìm trong header (mẫu Xuat_kho.xlsx).
const COL = {
  date: 'Ngày hạch toán',
  voucherNo: 'Số chứng từ',
  description: 'Diễn giải',
  total: 'Tổng tiền',
  receiver: 'Người nhận',
  salesDoc: 'Đã lập CT bán hàng',
  invoiceIssue: 'TT Phát hành hóa đơn',
  taxCode: 'Mã CQT cấp',
  type: 'Loại chứng từ',
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

// Lý do xuất suy từ text cột "Loại chứng từ".
function categoryFromText(text: string | null): GoodsIssueCategory {
  if (!text) return GoodsIssueCategory.OTHER
  if (text.includes('bán hàng')) return GoodsIssueCategory.SALES
  if (text.includes('sản xuất')) return GoodsIssueCategory.PRODUCTION
  return GoodsIssueCategory.OTHER
}

// Parse file xlsx danh sách xuất kho (mức tổng hợp, không có dòng hàng) → danh sách phiếu.
export function parseGoodsIssueXlsx(buffer: Buffer): ParsedGoodsIssue[] {
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

  const iDate = idx(COL.date)
  const iNo = idx(COL.voucherNo)
  const iDesc = idx(COL.description)
  const iTotal = idx(COL.total)
  const iReceiver = idx(COL.receiver)
  const iSalesDoc = idx(COL.salesDoc)
  const iInvoice = idx(COL.invoiceIssue)
  const iTaxCode = idx(COL.taxCode)
  const iType = idx(COL.type)

  const DAY = 86_400_000
  const out: ParsedGoodsIssue[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = iNo >= 0 ? toStr(r[iNo]) : null
    if (!voucherNo) continue // bỏ dòng tổng cộng / trống

    const rawDate = iDate >= 0 ? r[iDate] : null
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (như inventory-import).
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    out.push({
      voucherNo,
      category: categoryFromText(iType >= 0 ? toStr(r[iType]) : null),
      date,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      totalAmount: iTotal >= 0 ? toNumber(r[iTotal]) : 0,
      receiver: iReceiver >= 0 ? toStr(r[iReceiver]) : null,
      salesDocStatus: iSalesDoc >= 0 ? toStr(r[iSalesDoc]) : null,
      invoiceIssueStatus: iInvoice >= 0 ? toStr(r[iInvoice]) : null,
      taxAuthorityCode: iTaxCode >= 0 ? toStr(r[iTaxCode]) : null,
    })
  }
  return out
}
