import {
  PurchasePaymentStatus,
  PurchaseReceiveStatus,
  PurchaseVoucherType,
} from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedPurchase {
  voucherNo: string
  type: PurchaseVoucherType
  date: Date
  invoiceNo: string | null
  supplierName: string | null
  totalPayment: number
  purchaseCost: number
  stockValue: number
  receiveStatus: PurchaseReceiveStatus
  paymentStatus: PurchasePaymentStatus
  branchId: string | null
}

// Tên cột cần tìm trong header (mẫu Mua_hang_hoa_dich_vu.xlsx).
const COL = {
  voucherNo: 'Số chứng từ',
  date: 'Ngày hạch toán',
  invoiceNo: 'Số hóa đơn',
  supplier: 'Nhà cung cấp',
  totalPayment: 'Tổng tiền thanh toán',
  purchaseCost: 'Chi phí mua hàng',
  stockValue: 'Giá trị nhập kho',
  receive: 'TT nhận hóa đơn',
  payment: 'TT thanh toán',
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

// Loại chứng từ suy từ tiền tố số chứng từ (§10.1): NK→nhập kho, MDV→dịch vụ, còn lại→không qua kho.
function typeFromVoucherNo(no: string): PurchaseVoucherType {
  if (no.startsWith('NK')) return PurchaseVoucherType.STOCK
  if (no.startsWith('MDV')) return PurchaseVoucherType.SERVICE
  return PurchaseVoucherType.NON_STOCK
}

function receiveFromText(text: string | null): PurchaseReceiveStatus {
  return text && text.includes('Đã nhận')
    ? PurchaseReceiveStatus.RECEIVED
    : PurchaseReceiveStatus.NOT_RECEIVED
}

function paymentFromText(text: string | null): PurchasePaymentStatus {
  if (!text) return PurchasePaymentStatus.UNPAID
  if (text.includes('một phần')) return PurchasePaymentStatus.PARTIAL
  if (text.includes('Đã thanh toán')) return PurchasePaymentStatus.PAID
  return PurchasePaymentStatus.UNPAID
}

// Parse file xlsx chứng từ mua hàng (mức tổng hợp, không có dòng hàng) → danh sách chứng từ.
export function parsePurchaseXlsx(buffer: Buffer): ParsedPurchase[] {
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
  const iInvoice = idx(COL.invoiceNo)
  const iSupplier = idx(COL.supplier)
  const iPayment = idx(COL.totalPayment)
  const iCost = idx(COL.purchaseCost)
  const iStock = idx(COL.stockValue)
  const iReceive = idx(COL.receive)
  const iPayStatus = idx(COL.payment)
  const iBranch = idx(COL.branch)

  const DAY = 86_400_000
  const out: ParsedPurchase[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = toStr(r[iNo])
    if (!voucherNo) continue

    const rawDate = r[iDate]
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (như cash-import).
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    out.push({
      voucherNo,
      type: typeFromVoucherNo(voucherNo),
      date,
      invoiceNo: iInvoice >= 0 ? toStr(r[iInvoice]) : null,
      supplierName: iSupplier >= 0 ? toStr(r[iSupplier]) : null,
      totalPayment: iPayment >= 0 ? toNumber(r[iPayment]) : 0,
      purchaseCost: iCost >= 0 ? toNumber(r[iCost]) : 0,
      stockValue: iStock >= 0 ? toNumber(r[iStock]) : 0,
      receiveStatus: receiveFromText(iReceive >= 0 ? toStr(r[iReceive]) : null),
      paymentStatus: paymentFromText(iPayStatus >= 0 ? toStr(r[iPayStatus]) : null),
      branchId: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
