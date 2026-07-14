import type {
  BankBalanceReportDto,
  BankBalanceRowDto,
  BankBookReportDto,
  BankBookRowDto,
  BankBookSectionDto,
  DailyBalanceReportDto,
  DailyBalanceRowDto,
} from '@app/shared'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { BankBalanceFilterDto, BankReportFilterDto } from './dto/bank-report-filter.dto'

const ZERO = new Prisma.Decimal(0)
// Mọi TK con của 112 (1121, 1122…) đều thuộc tiền gửi ngân hàng.
const BANK_LIKE = `${CHART_OF_ACCOUNTS.BANK}%`

// Dòng hạch toán chạm TK 112x trả về từ SQL (ngày ép ::text → 'yyyy-mm-dd').
interface RawLine {
  voucher_id: string
  source: 'BANK' | 'CASH'
  voucher_type: 'RECEIPT' | 'PAYMENT'
  posting_date: string
  voucher_date: string
  voucher_no: string
  description: string | null
  bank_account_no: string // '' nếu chứng từ chưa chọn TKNH
  bank_name: string | null
  counter_account: string
  kind: 'RECEIPT' | 'PAYMENT'
  amount: string
}

// Báo cáo phân hệ Tiền gửi: sổ tiền gửi ngân hàng, bảng kê số dư ngân hàng,
// bảng kê số dư tiền theo ngày. Phát sinh TK 112x đến từ 2 nguồn phải UNION:
// - bank_voucher_lines (NTTK/UNC) — TKNH lấy từ header bank_vouchers.bank_account_no;
// - cash_voucher_lines (gửi/rút tiền NH: Nợ/Có 112x) — TKNH lấy từ line.
// Số dư đầu kỳ = khai báo (bank_account_opening_balances / account_opening_balances)
// + phát sinh trước kỳ. Sales/purchase không tự sinh chứng từ tiền gửi.
@Injectable()
export class BankReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Sổ tiền gửi ngân hàng (group theo TK ngân hàng) ────────────────────────
  async bankBook(filter: BankReportFilterDto): Promise<BankBookReportDto> {
    const { from, to } = parseRange(filter)
    const [declared, preMovement, lines, catalogNames] = await Promise.all([
      this.declaredWithUnallocated(),
      this.movementByAccount(Prisma.sql`v.posting_date < ${from}`),
      this.linesInRange(from, to),
      this.catalogBankNames(),
    ])

    // Gom mọi TKNH xuất hiện ở số dư khai báo / phát sinh trước kỳ / trong kỳ.
    const openings = new Map<string, Prisma.Decimal>()
    const names = new Map<string, string | null>(catalogNames)
    for (const r of declared) {
      openings.set(r.key, (openings.get(r.key) ?? ZERO).add(r.amount))
      if (!names.has(r.key)) names.set(r.key, r.bankName)
    }
    for (const r of preMovement) {
      openings.set(r.key, (openings.get(r.key) ?? ZERO).add(r.amount))
    }

    const byAccount = new Map<string, RawLine[]>()
    for (const l of lines) {
      const list = byAccount.get(l.bank_account_no) ?? []
      list.push(l)
      byAccount.set(l.bank_account_no, list)
      if (!names.get(l.bank_account_no) && l.bank_name) names.set(l.bank_account_no, l.bank_name)
    }

    let keys = [...new Set([...openings.keys(), ...byAccount.keys()])].sort()
    if (filter.bankAccountNo) keys = keys.filter((k) => k === filter.bankAccountNo)

    const sections: BankBookSectionDto[] = []
    for (const key of keys) {
      const opening = openings.get(key) ?? ZERO
      const accountLines = byAccount.get(key) ?? []
      // Bỏ TKNH không có số dư lẫn phát sinh (thường là TK catalog chưa dùng).
      if (opening.isZero() && accountLines.length === 0) continue

      let balance = opening
      let totalReceipt = ZERO
      let totalPayment = ZERO
      const rows: BankBookRowDto[] = accountLines.map((l) => {
        const isReceipt = l.kind === 'RECEIPT'
        if (isReceipt) {
          totalReceipt = totalReceipt.add(l.amount)
          balance = balance.add(l.amount)
        } else {
          totalPayment = totalPayment.add(l.amount)
          balance = balance.sub(l.amount)
        }
        return {
          voucherId: l.voucher_id,
          voucherSource: l.source,
          voucherType: l.voucher_type,
          postingDate: l.posting_date,
          voucherDate: l.voucher_date,
          voucherNo: l.voucher_no,
          description: l.description,
          counterAccount: l.counter_account,
          receiptAmount: isReceipt ? l.amount : '0',
          paymentAmount: isReceipt ? '0' : l.amount,
          balance: balance.toString(),
        }
      })

      sections.push({
        bankAccountNo: key,
        bankName: names.get(key) ?? null,
        openingBalance: opening.toString(),
        totalReceipt: totalReceipt.toString(),
        totalPayment: totalPayment.toString(),
        closingBalance: balance.toString(),
        rows,
      })
    }

    return { fromDate: filter.fromDate, toDate: filter.toDate, sections }
  }

  // ── Bảng kê số dư ngân hàng (tại ngày toDate) ──────────────────────────────
  async accountBalances(filter: BankBalanceFilterDto): Promise<BankBalanceReportDto> {
    const to = parseDate(filter.toDate)
    const [declared, movement, accounts] = await Promise.all([
      this.declaredWithUnallocated(),
      this.movementByAccount(Prisma.sql`v.posting_date <= ${to}`),
      this.prisma.bankAccount.findMany({
        select: { accountNumber: true, bankName: true, bankBranch: true },
      }),
    ])

    const balances = new Map<string, Prisma.Decimal>()
    const meta = new Map<string, { bankName: string | null; bankBranch: string | null }>()
    for (const a of accounts) {
      balances.set(a.accountNumber, ZERO)
      meta.set(a.accountNumber, { bankName: a.bankName, bankBranch: a.bankBranch })
    }
    for (const r of [...declared, ...movement]) {
      balances.set(r.key, (balances.get(r.key) ?? ZERO).add(r.amount))
      if (!meta.has(r.key)) meta.set(r.key, { bankName: r.bankName, bankBranch: null })
    }

    let total = ZERO
    const rows: BankBalanceRowDto[] = [...balances.keys()].sort().map((key) => {
      const balance = balances.get(key) ?? ZERO
      total = total.add(balance)
      return {
        bankAccountNo: key,
        bankName: meta.get(key)?.bankName ?? null,
        bankBranch: meta.get(key)?.bankBranch ?? null,
        balance: balance.toString(),
      }
    })

    return { toDate: filter.toDate, totalBalance: total.toString(), rows }
  }

  // ── Bảng kê số dư tiền theo ngày (chỉ ngày có phát sinh) ───────────────────
  async dailyBalance(filter: BankReportFilterDto): Promise<DailyBalanceReportDto> {
    const { from, to } = parseRange(filter)
    const [opening, daily] = await Promise.all([
      this.openingBankBalance(from),
      this.prisma.$queryRaw<{ d: string; receipt: string; payment: string }[]>(Prisma.sql`
        SELECT t.d,
               COALESCE(SUM(t.receipt), 0)::text AS receipt,
               COALESCE(SUM(t.payment), 0)::text AS payment
        FROM (
          SELECT v.posting_date::text AS d,
                 CASE WHEN l.debit_account LIKE ${BANK_LIKE} THEN l.amount ELSE 0 END AS receipt,
                 CASE WHEN l.credit_account LIKE ${BANK_LIKE} THEN l.amount ELSE 0 END AS payment
          FROM bank_voucher_lines l
          JOIN bank_vouchers v ON v.id = l.voucher_id
          WHERE v.posted AND v.posting_date BETWEEN ${from} AND ${to}
            AND (l.debit_account LIKE ${BANK_LIKE} OR l.credit_account LIKE ${BANK_LIKE})
          UNION ALL
          SELECT v.posting_date::text,
                 CASE WHEN l.debit_account LIKE ${BANK_LIKE} THEN l.amount ELSE 0 END,
                 CASE WHEN l.credit_account LIKE ${BANK_LIKE} THEN l.amount ELSE 0 END
          FROM cash_voucher_lines l
          JOIN cash_vouchers v ON v.id = l.voucher_id
          WHERE v.posted AND v.posting_date BETWEEN ${from} AND ${to}
            AND (l.debit_account LIKE ${BANK_LIKE} OR l.credit_account LIKE ${BANK_LIKE})
        ) t
        GROUP BY t.d
        ORDER BY t.d
      `),
    ])

    let balance = opening
    let totalReceipt = ZERO
    let totalPayment = ZERO
    const rows: DailyBalanceRowDto[] = daily.map((r) => {
      const openingOfDay = balance
      totalReceipt = totalReceipt.add(r.receipt)
      totalPayment = totalPayment.add(r.payment)
      balance = balance.add(r.receipt).sub(r.payment)
      return {
        date: r.d,
        openingBalance: openingOfDay.toString(),
        receiptAmount: r.receipt,
        paymentAmount: r.payment,
        closingBalance: balance.toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      openingBalance: opening.toString(),
      totalReceipt: totalReceipt.toString(),
      totalPayment: totalPayment.toString(),
      closingBalance: balance.toString(),
      rows,
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Dòng hạch toán chạm TK 112x trong kỳ, thứ tự ghi sổ. Dòng chuyển giữa
  // 2 TK 112x sinh ra cả dòng thu lẫn dòng chi (đúng bản chất sổ tiền gửi).
  private async linesInRange(from: Date, to: Date): Promise<RawLine[]> {
    return this.prisma.$queryRaw<RawLine[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             'BANK' AS source,
             v.type::text AS voucher_type,
             v.posting_date::text AS posting_date,
             v.voucher_date::text AS voucher_date,
             v.voucher_no,
             COALESCE(l.description, v.reason) AS description,
             COALESCE(v.bank_account_no, '') AS bank_account_no,
             v.bank_name,
             CASE WHEN k.kind = 'RECEIPT' THEN l.credit_account ELSE l.debit_account END AS counter_account,
             k.kind,
             l.amount::text AS amount,
             l.line_no
      FROM bank_voucher_lines l
      JOIN bank_vouchers v ON v.id = l.voucher_id
      CROSS JOIN LATERAL (
        VALUES ('RECEIPT'), ('PAYMENT')
      ) AS k(kind)
      WHERE v.posted AND v.posting_date BETWEEN ${from} AND ${to}
        AND (
          (k.kind = 'RECEIPT' AND l.debit_account LIKE ${BANK_LIKE})
          OR (k.kind = 'PAYMENT' AND l.credit_account LIKE ${BANK_LIKE})
        )
      UNION ALL
      SELECT v.id,
             'CASH',
             v.type::text,
             v.posting_date::text,
             v.voucher_date::text,
             v.voucher_no,
             COALESCE(l.description, v.reason),
             COALESCE(l.bank_account_no, ''),
             l.bank_name,
             CASE WHEN k.kind = 'RECEIPT' THEN l.credit_account ELSE l.debit_account END,
             k.kind,
             l.amount::text,
             l.line_no
      FROM cash_voucher_lines l
      JOIN cash_vouchers v ON v.id = l.voucher_id
      CROSS JOIN LATERAL (
        VALUES ('RECEIPT'), ('PAYMENT')
      ) AS k(kind)
      WHERE v.posted AND v.posting_date BETWEEN ${from} AND ${to}
        AND (
          (k.kind = 'RECEIPT' AND l.debit_account LIKE ${BANK_LIKE})
          OR (k.kind = 'PAYMENT' AND l.credit_account LIKE ${BANK_LIKE})
        )
      ORDER BY posting_date, voucher_no, line_no, kind
    `)
  }

  // Số dư khai báo theo TKNH + phần khai báo TK 112 tổng chưa phân bổ chi tiết.
  // account_opening_balances (tổng 112) và bank_account_opening_balances (chi tiết
  // theo TKNH) nhập độc lập — phần chênh gán vào key '' ("Chưa chọn TK ngân hàng")
  // để tổng của bảng kê/sổ tiền gửi luôn khớp bảng kê số dư tiền theo ngày.
  private async declaredWithUnallocated(): Promise<AccountAmount[]> {
    const [byAccount, total] = await Promise.all([
      this.declaredByAccount(),
      this.declaredTotal(),
    ])
    const allocated = byAccount.reduce((sum, r) => sum.add(r.amount), ZERO)
    const unallocated = total.sub(allocated)
    if (unallocated.isZero()) return byAccount
    return [...byAccount, { key: '', bankName: null, amount: unallocated.toString() }]
  }

  // Tổng số dư khai báo TK 112 — ưu tiên dòng '112'; thiếu mới cộng các dòng con.
  private async declaredTotal(): Promise<Prisma.Decimal> {
    const rows = await this.prisma.$queryRaw<{ s: string }[]>(Prisma.sql`
      SELECT COALESCE(
        (SELECT debit_amount - credit_amount FROM account_opening_balances
         WHERE account_code = ${CHART_OF_ACCOUNTS.BANK}),
        (SELECT COALESCE(SUM(debit_amount - credit_amount), 0) FROM account_opening_balances
         WHERE account_code LIKE ${BANK_LIKE} AND account_code <> ${CHART_OF_ACCOUNTS.BANK})
      )::text AS s
    `)
    return new Prisma.Decimal(rows[0]?.s ?? 0)
  }

  // Số dư khai báo đầu kỳ theo từng TKNH (1 TKNH có thể có nhiều dòng theo TK 1121/1122…).
  private async declaredByAccount(): Promise<AccountAmount[]> {
    const rows = await this.prisma.$queryRaw<
      { bank_account_no: string; bank_name: string | null; s: string }[]
    >(Prisma.sql`
      SELECT ba.account_number AS bank_account_no,
             ba.bank_name,
             SUM(b.debit_amount - b.credit_amount)::text AS s
      FROM bank_account_opening_balances b
      JOIN bank_accounts ba ON ba.id = b.bank_account_id
      GROUP BY ba.account_number, ba.bank_name
    `)
    return rows.map((r) => ({ key: r.bank_account_no, bankName: r.bank_name, amount: r.s }))
  }

  // Net phát sinh TK 112x theo từng TKNH với điều kiện thời gian tùy chọn.
  private async movementByAccount(dateCond: Prisma.Sql): Promise<AccountAmount[]> {
    const delta = (accountFrom: Prisma.Sql) => Prisma.sql`
      SELECT ${accountFrom} AS bank_account_no,
             CASE WHEN l.debit_account LIKE ${BANK_LIKE} THEN l.amount ELSE 0 END
             - CASE WHEN l.credit_account LIKE ${BANK_LIKE} THEN l.amount ELSE 0 END AS delta
    `
    const rows = await this.prisma.$queryRaw<{ bank_account_no: string; s: string }[]>(Prisma.sql`
      SELECT t.bank_account_no, SUM(t.delta)::text AS s
      FROM (
        ${delta(Prisma.sql`COALESCE(v.bank_account_no, '')`)}
        FROM bank_voucher_lines l
        JOIN bank_vouchers v ON v.id = l.voucher_id
        WHERE v.posted AND ${dateCond}
          AND (l.debit_account LIKE ${BANK_LIKE} OR l.credit_account LIKE ${BANK_LIKE})
        UNION ALL
        ${delta(Prisma.sql`COALESCE(l.bank_account_no, '')`)}
        FROM cash_voucher_lines l
        JOIN cash_vouchers v ON v.id = l.voucher_id
        WHERE v.posted AND ${dateCond}
          AND (l.debit_account LIKE ${BANK_LIKE} OR l.credit_account LIKE ${BANK_LIKE})
      ) t
      GROUP BY t.bank_account_no
    `)
    return rows.map((r) => ({ key: r.bank_account_no, bankName: null, amount: r.s }))
  }

  // Tên ngân hàng theo số TK từ danh mục (ưu tiên hơn bank_name lưu trên chứng từ).
  private async catalogBankNames(): Promise<Map<string, string | null>> {
    const accounts = await this.prisma.bankAccount.findMany({
      select: { accountNumber: true, bankName: true },
    })
    return new Map(accounts.map((a) => [a.accountNumber, a.bankName]))
  }

  // Tổng số dư tiền gửi đầu kỳ = số dư khai báo TK 112 + phát sinh trước `from`.
  private async openingBankBalance(from: Date): Promise<Prisma.Decimal> {
    const [declared, movement] = await Promise.all([
      this.declaredTotal(),
      this.movementByAccount(Prisma.sql`v.posting_date < ${from}`).then((rows) =>
        rows.reduce((sum, r) => sum.add(r.amount), ZERO),
      ),
    ])
    return declared.add(movement)
  }
}

// Số dư/phát sinh gắn với 1 TKNH (key = số TK, '' nếu chứng từ chưa chọn TKNH).
interface AccountAmount {
  key: string
  bankName: string | null
  amount: string
}

// Kỳ báo cáo → Date (cột kiểu DATE, bỏ giờ).
function parseRange(filter: BankReportFilterDto): { from: Date; to: Date } {
  const from = parseDate(filter.fromDate)
  const to = parseDate(filter.toDate)
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException('Từ ngày phải nhỏ hơn hoặc bằng đến ngày')
  }
  return { from, to }
}

function parseDate(iso: string): Date {
  return new Date(iso)
}
