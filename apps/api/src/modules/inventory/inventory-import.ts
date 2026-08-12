import { InventoryReceiptType } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedReceipt {
  voucherNo: string
  receiptType: InventoryReceiptType
  date: Date
  description: string | null
  totalAmount: number
  deliverer: string | null
  branchId: string | null
}

// Tên cột cần tìm trong header (mẫu Nhap_kho.xlsx).
const COL = {
  date: 'Ngày hạch toán',
  voucherNo: 'Số chứng từ',
  description: 'Diễn giải',
  total: 'Tổng tiền',
  deliverer: 'Người giao',
  type: 'Loại chứng từ',
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

// Loại chứng từ suy từ text cột "Loại chứng từ" — chỉ còn 2 loại, mặc định mua hàng.
function typeFromText(text: string | null): InventoryReceiptType {
  if (text?.includes('thành phẩm')) return InventoryReceiptType.FINISHED_GOODS
  return InventoryReceiptType.PURCHASE
}

// Parse file xlsx danh sách nhập kho (mức tổng hợp, không có dòng hàng) → danh sách phiếu.
export function parseReceiptXlsx(buffer: Buffer): ParsedReceipt[] {
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
  const iDeliverer = idx(COL.deliverer)
  const iType = idx(COL.type)
  const iBranch = idx(COL.branch)

  const DAY = 86_400_000
  const out: ParsedReceipt[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = iNo >= 0 ? toStr(r[iNo]) : null
    if (!voucherNo) continue // bỏ dòng tổng cộng / trống

    const rawDate = iDate >= 0 ? r[iDate] : null
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
    // SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (như purchase-import).
    const date = Number.isNaN(parsed.getTime())
      ? new Date()
      : new Date(Math.round(parsed.getTime() / DAY) * DAY)

    out.push({
      voucherNo,
      receiptType: typeFromText(iType >= 0 ? toStr(r[iType]) : null),
      date,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      totalAmount: iTotal >= 0 ? toNumber(r[iTotal]) : 0,
      deliverer: iDeliverer >= 0 ? toStr(r[iDeliverer]) : null,
      branchId: iBranch >= 0 ? toStr(r[iBranch]) : null,
    })
  }
  return out
}
