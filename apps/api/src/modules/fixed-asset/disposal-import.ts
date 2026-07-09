import * as XLSX from 'xlsx'

// 1 dòng Danh sách ghi giảm TSCD (chỉ phần header — file MISA không kèm chi tiết tài sản).
export interface ParsedDisposal {
  voucherNo: string
  postingDate: Date
  voucherDate: Date
  reason: string | null
}

// Tên cột cần tìm trong header (đối chiếu Danh_sach_ghi_giam_tai_san_co_dinh_.xlsx).
const COL = {
  voucherNo: 'Số chứng từ',
  postingDate: 'Ngày hạch toán',
  voucherDate: 'Ngày chứng từ',
  reason: 'Lý do ghi giảm',
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất (date-only đúng).
function toDate(v: unknown): Date {
  const parsed = v instanceof Date ? v : new Date(String(v ?? ''))
  const DAY = 86_400_000
  return Number.isNaN(parsed.getTime())
    ? new Date()
    : new Date(Math.round(parsed.getTime() / DAY) * DAY)
}

// Parse file xlsx Danh sách ghi giảm → danh sách chứng từ (không chi tiết tài sản).
export function parseDisposalXlsx(buffer: Buffer): ParsedDisposal[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
  })

  const headerIdx = rows.findIndex((r) => r.some((c) => toStr(c) === COL.voucherNo))
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (name: string) => header.indexOf(name)

  const iNo = idx(COL.voucherNo)
  const iPosting = idx(COL.postingDate)
  const iVoucher = idx(COL.voucherDate)
  const iReason = idx(COL.reason)

  const out: ParsedDisposal[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const voucherNo = toStr(r[iNo])
    if (!voucherNo) continue
    // Bỏ dòng "Tổng" cuối bảng (không có số chứng từ hợp lệ đã lọc ở trên).
    const posting = iPosting >= 0 ? toDate(r[iPosting]) : new Date()
    out.push({
      voucherNo,
      postingDate: posting,
      voucherDate: iVoucher >= 0 ? toDate(r[iVoucher]) : posting,
      reason: iReason >= 0 ? toStr(r[iReason]) : null,
    })
  }
  return out
}
