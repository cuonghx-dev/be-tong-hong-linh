import type { SaveAccountOpeningBalanceLineInput } from '@app/shared'

// 1 dòng số dư trong bảng (nguồn dữ liệu cục bộ, dùng chung 2 trang).
export interface BalanceRow {
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
}

// Cây số dư dựng theo prefix số TK (1111 con của 111) — TK gốc chỉ vài trăm dòng.
// Cha = tổng cộng dồn các TK con (rollup), giống danh sách MISA; không lưu số cha nhập tay.
export function buildTree(rows: BalanceRow[]) {
  const sorted = [...rows]
    .filter((r) => r.accountCode.trim() !== '')
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  const codes = sorted.map((r) => r.accountCode)
  const byCode = new Map(sorted.map((r) => [r.accountCode, r]))

  // Cha của mỗi TK = số TK dài nhất là tiền tố của nó (vd cha của 21111 là 2111).
  const parentOf = new Map<string, string | null>()
  const childrenOf = new Map<string, string[]>()
  for (const c of codes) {
    let best: string | null = null
    for (const p of codes) {
      if (p !== c && c.startsWith(p) && (!best || p.length > best.length)) best = p
    }
    parentOf.set(c, best)
    if (best) childrenOf.set(best, [...(childrenOf.get(best) ?? []), c])
  }

  const hasChildren = (c: string) => (childrenOf.get(c)?.length ?? 0) > 0

  // Cộng dồn xuống lá: TK cha = tổng các lá cháu; TK lá = số nhập tay của chính nó.
  const rollup = (c: string): { debit: number; credit: number } => {
    if (!hasChildren(c)) {
      const r = byCode.get(c)
      return { debit: r?.debitAmount ?? 0, credit: r?.creditAmount ?? 0 }
    }
    let debit = 0
    let credit = 0
    for (const ch of childrenOf.get(c) ?? []) {
      const s = rollup(ch)
      debit += s.debit
      credit += s.credit
    }
    return { debit, credit }
  }

  const ancestors = (c: string) => {
    const out: string[] = []
    let p = parentOf.get(c) ?? null
    while (p) {
      out.push(p)
      p = parentOf.get(p) ?? null
    }
    return out
  }

  return { sorted, codes, byCode, parentOf, hasChildren, rollup, ancestors }
}

// Chuẩn hóa dữ liệu lưu: TK cha ghi số cộng dồn, TK lá ghi số nhập tay (khớp cách MISA lưu).
export function toSaveItems(rows: BalanceRow[]): SaveAccountOpeningBalanceLineInput[] {
  const t = buildTree(rows)
  return t.sorted.map((r) => {
    const amounts = t.hasChildren(r.accountCode)
      ? t.rollup(r.accountCode)
      : { debit: r.debitAmount, credit: r.creditAmount }
    return {
      accountCode: r.accountCode,
      accountName: r.accountName,
      debitAmount: amounts.debit,
      creditAmount: amounts.credit,
    }
  })
}

// Nhãn cột "Chi tiết số dư" theo loại TK (như MISA) — dẫn tới màn nhập chi tiết tương ứng.
export function detailBalanceLabel(code: string): string {
  if (code.startsWith('112')) return 'Nhập số dư tài khoản ngân hàng'
  if (code.startsWith('131')) return 'Nhập số dư công nợ khách hàng'
  if (code.startsWith('331')) return 'Nhập số dư công nợ nhà cung cấp'
  if (/^(151|152|153|154|155|156|157|158)/.test(code)) return 'Nhập tồn kho VTHH'
  if (/^(211|212|213|214|217)/.test(code)) return 'Nhập tài sản cố định đầu kỳ'
  if (code.startsWith('242')) return 'Nhập công cụ dụng cụ đầu kỳ'
  return 'Nhập chi tiết số dư'
}
