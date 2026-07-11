import * as XLSX from 'xlsx'

export interface ParsedBankAccount {
  accountNumber: string
  bankName: string
  bankBranch: string | null
  accountHolder: string | null
  branch: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_tai_khoan_ngan_hang.xlsx).
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  accountNumber: ['Số tài khoản', 'Số TK'],
  bankName: ['Tên ngân hàng'],
  bankBranch: ['Tên chi nhánh ngân hàng', 'Chi nhánh ngân hàng'],
  accountHolder: ['Chủ tài khoản'],
  branch: ['Chi nhánh'],
  status: ['Trạng thái'],
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// Chuẩn hóa header để so khớp: bỏ khoảng trắng thừa + hạ chữ thường.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// "Ngừng sử dụng" → false; còn lại (kể cả thiếu cột) coi là đang sử dụng.
function activeFromText(text: string | null): boolean {
  return !(text && text.toLowerCase().includes('ngừng'))
}

// Parse file xlsx tài khoản ngân hàng → danh sách tài khoản.
export function parseBankAccountXlsx(buffer: Buffer): ParsedBankAccount[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa một trong các nhãn "số tài khoản" (không phân biệt hoa/thường).
  const accountNorm = COL.accountNumber.map(normalize)
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => accountNorm.includes(normalize(toStr(c) ?? ''))),
  )
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => normalize(toStr(c) ?? ''))
  // Trả về vị trí cột đầu tiên khớp bất kỳ tên nào trong danh sách.
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(normalize(n))
      if (i >= 0) return i
    }
    return -1
  }

  const iAccountNumber = idx(COL.accountNumber)
  const iBankName = idx(COL.bankName)
  const iBankBranch = idx(COL.bankBranch)
  const iAccountHolder = idx(COL.accountHolder)
  const iBranch = idx(COL.branch)
  const iStatus = idx(COL.status)

  const out: ParsedBankAccount[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const accountNumber = iAccountNumber >= 0 ? toStr(r[iAccountNumber]) : null
    const bankName = iBankName >= 0 ? toStr(r[iBankName]) : null
    if (!accountNumber || !bankName) continue // bỏ dòng thiếu số TK hoặc tên ngân hàng

    out.push({
      accountNumber,
      bankName,
      bankBranch: iBankBranch >= 0 ? toStr(r[iBankBranch]) : null,
      accountHolder: iAccountHolder >= 0 ? toStr(r[iAccountHolder]) : null,
      branch: iBranch >= 0 ? toStr(r[iBranch]) : null,
      isActive: activeFromText(iStatus >= 0 ? toStr(r[iStatus]) : null),
    })
  }
  return out
}
