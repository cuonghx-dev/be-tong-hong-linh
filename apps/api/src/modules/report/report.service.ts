import type {
  AccountLedgerReportDto,
  AccountLedgerRowDto,
  AccountLedgerSectionDto,
  GeneralJournalReportDto,
  GeneralJournalVoucherDto,
} from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AccountLedgerFilterDto, GeneralJournalFilterDto } from './dto/report-filter.dto'

const ZERO = new Prisma.Decimal(0)
const DEFAULT_PAGE_SIZE = 20

// Nhãn loại chứng từ hiển thị trên sổ (khớp key `kind` trong journalSql).
const VOUCHER_KIND_LABELS: Record<string, string> = {
  CASH_RECEIPT: 'Phiếu thu',
  CASH_PAYMENT: 'Phiếu chi',
  BANK_RECEIPT: 'Thu tiền gửi',
  BANK_PAYMENT: 'Chi tiền gửi',
  PURCHASE: 'Mua hàng',
  SALES: 'Bán hàng',
  INVENTORY_RECEIPT: 'Nhập kho',
  GOODS_ISSUE: 'Xuất kho',
  GENERAL: 'Chứng từ nghiệp vụ khác',
}

// 1 bút toán (Nợ/Có/số tiền) đã chuẩn hóa từ journalSql (ngày ép ::text).
interface RawJournalLine {
  posting_date: string
  voucher_date: string
  voucher_no: string
  kind: string
  description: string | null
  debit_account: string
  credit_account: string
  amount: string
}

// 1 dòng phát sinh của 1 TK (bút toán tách 2 vế qua LATERAL).
interface RawLedgerRow extends RawJournalLine {
  account: string
  side: 'D' | 'C'
  counter_account: string
}

// Báo cáo Tổng hợp — Sổ sách kế toán: Sổ nhật ký chung (S03a-DNN), Sổ chi tiết
// các tài khoản (S03b-DNN). Bút toán gom từ MỌI chứng từ toàn hệ thống qua
// journalSql (UNION ALL 7 bảng line); số dư đầu kỳ TK = số dư khai báo
// (account_opening_balances) + phát sinh trước kỳ.
@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── S03a-DNN: Sổ nhật ký chung ─────────────────────────────────────────────
  // Gộp nhóm theo chứng từ, mỗi bút toán 2 dòng (vế Nợ rồi vế Có); phân trang
  // theo chứng từ, tổng PS Nợ/Có tính trên toàn kỳ.
  async generalJournal(filter: GeneralJournalFilterDto): Promise<GeneralJournalReportDto> {
    const { from, to } = parseRange(filter)
    const page = filter.page ?? 1
    const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE

    const lines = await this.prisma.$queryRaw<RawJournalLine[]>(Prisma.sql`
      SELECT j.posting_date::text AS posting_date,
             j.voucher_date::text AS voucher_date,
             j.voucher_no, j.kind, j.description,
             j.debit_account, j.credit_account,
             j.amount::text AS amount
      FROM (${this.journalSql()}) j
      WHERE j.posting_date BETWEEN ${from} AND ${to}
      ORDER BY j.posting_date, j.kind, j.voucher_no, j.line_no, j.sub
    `)

    // Dòng đã liền mạch theo (kind, voucher_no) nhờ ORDER BY → gộp tuần tự.
    let totalDebit = ZERO
    const vouchers: GeneralJournalVoucherDto[] = []
    for (const l of lines) {
      totalDebit = totalDebit.add(l.amount)
      let voucher = vouchers[vouchers.length - 1]
      if (!voucher || voucher.voucherNo !== l.voucher_no || voucher.voucherKind !== kindLabel(l.kind)) {
        voucher = {
          postingDate: l.posting_date,
          voucherDate: l.voucher_date,
          voucherNo: l.voucher_no,
          voucherKind: kindLabel(l.kind),
          rows: [],
        }
        vouchers.push(voucher)
      }
      voucher.rows.push(
        { description: l.description, account: l.debit_account, debitAmount: l.amount, creditAmount: '0' },
        { description: null, account: l.credit_account, debitAmount: '0', creditAmount: l.amount },
      )
    }

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      page,
      pageSize,
      totalVouchers: vouchers.length,
      totalDebit: totalDebit.toString(),
      totalCredit: totalDebit.toString(), // bút toán kép: mỗi bút toán ghi Nợ = ghi Có
      vouchers: vouchers.slice((page - 1) * pageSize, page * pageSize),
    }
  }

  // ── S03b-DNN: Sổ chi tiết các tài khoản ────────────────────────────────────
  // Mỗi TK 1 section: dư đầu kỳ (khai báo + phát sinh trước kỳ), dòng phát sinh
  // kèm TK đối ứng + dư lũy kế, cộng phát sinh và dư cuối kỳ. Dư ghi về cột
  // Nợ/Có theo dấu (Nợ − Có), không phụ thuộc tính chất TK.
  async accountLedger(filter: AccountLedgerFilterDto): Promise<AccountLedgerReportDto> {
    const { from, to } = parseRange(filter)
    const acctLike = filter.accountCode ? `${filter.accountCode}%` : '%'

    const [declared, preMovement, rows, accountNames] = await Promise.all([
      this.prisma.$queryRaw<{ account: string; s: string }[]>(Prisma.sql`
        SELECT account_code AS account, (debit_amount - credit_amount)::text AS s
        FROM account_opening_balances
        WHERE account_code LIKE ${acctLike}
      `),
      this.prisma.$queryRaw<{ account: string; s: string }[]>(Prisma.sql`
        SELECT s.account,
               COALESCE(SUM(CASE WHEN s.side = 'D' THEN j.amount ELSE -j.amount END), 0)::text AS s
        FROM (${this.journalSql()}) j
        CROSS JOIN LATERAL (VALUES (j.debit_account, 'D'), (j.credit_account, 'C')) AS s(account, side)
        WHERE j.posting_date < ${from} AND s.account <> '' AND s.account LIKE ${acctLike}
        GROUP BY s.account
      `),
      this.prisma.$queryRaw<RawLedgerRow[]>(Prisma.sql`
        SELECT s.account, s.side,
               CASE WHEN s.side = 'D' THEN j.credit_account ELSE j.debit_account END AS counter_account,
               j.posting_date::text AS posting_date,
               j.voucher_date::text AS voucher_date,
               j.voucher_no, j.kind, j.description,
               j.debit_account, j.credit_account,
               j.amount::text AS amount
        FROM (${this.journalSql()}) j
        CROSS JOIN LATERAL (VALUES (j.debit_account, 'D'), (j.credit_account, 'C')) AS s(account, side)
        -- TK rỗng (dữ liệu import chưa định khoản) không lên sổ chi tiết.
        WHERE j.posting_date BETWEEN ${from} AND ${to} AND s.account <> '' AND s.account LIKE ${acctLike}
        ORDER BY s.account, j.posting_date, j.kind, j.voucher_no, j.line_no, j.sub, s.side DESC
      `),
      this.prisma.$queryRaw<{ number: string; name: string }[]>(Prisma.sql`
        SELECT number, name FROM accounts WHERE number LIKE ${acctLike}
      `),
    ])

    // Dư đầu kỳ theo TK (dấu dương = dư Nợ). Giữ riêng map phát sinh trước kỳ
    // để phân biệt TK cha chỉ có dư khai báo (sẽ lược bỏ) với TK có ghi sổ thật.
    const openings = new Map<string, Prisma.Decimal>()
    const preMoved = new Set(preMovement.map((r) => r.account))
    for (const r of [...declared, ...preMovement]) {
      openings.set(r.account, (openings.get(r.account) ?? ZERO).add(r.s))
    }
    const names = new Map(accountNames.map((a) => [a.number, a.name]))

    const byAccount = new Map<string, RawLedgerRow[]>()
    for (const r of rows) {
      const list = byAccount.get(r.account) ?? []
      list.push(r)
      byAccount.set(r.account, list)
    }

    const keys = [...new Set([...openings.keys(), ...byAccount.keys()])].sort()
    const sections: AccountLedgerSectionDto[] = []
    for (const key of keys) {
      const opening = openings.get(key) ?? ZERO
      const accountRows = byAccount.get(key) ?? []
      // Bỏ TK không có số dư lẫn phát sinh (thường là dòng khai báo 0).
      if (opening.isZero() && accountRows.length === 0) continue
      // Bỏ TK cha chỉ có dư khai báo (bảng khai báo lưu cả cha lẫn con, dư cha
      // = tổng các con): không phát sinh trước/trong kỳ và có TK con lên sổ.
      if (
        accountRows.length === 0 &&
        !preMoved.has(key) &&
        keys.some((k) => k !== key && k.startsWith(key))
      ) {
        continue
      }

      let balance = opening
      let totalDebit = ZERO
      let totalCredit = ZERO
      const sectionRows: AccountLedgerRowDto[] = accountRows.map((r) => {
        const isDebit = r.side === 'D'
        if (isDebit) {
          totalDebit = totalDebit.add(r.amount)
          balance = balance.add(r.amount)
        } else {
          totalCredit = totalCredit.add(r.amount)
          balance = balance.sub(r.amount)
        }
        return {
          postingDate: r.posting_date,
          voucherDate: r.voucher_date,
          voucherNo: r.voucher_no,
          voucherKind: kindLabel(r.kind),
          description: r.description,
          counterAccount: r.counter_account,
          debitAmount: isDebit ? r.amount : '0',
          creditAmount: isDebit ? '0' : r.amount,
          ...splitBalance(balance, 'balanceDebit', 'balanceCredit'),
        }
      })

      sections.push({
        accountCode: key,
        accountName: names.get(key) ?? null,
        ...splitBalance(opening, 'openingDebit', 'openingCredit'),
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
        ...splitBalance(balance, 'closingDebit', 'closingCredit'),
        rows: sectionRows,
      })
    }

    return { fromDate: filter.fromDate, toDate: filter.toDate, sections }
  }

  // ── Journal union: chuẩn hóa bút toán từ mọi bảng chứng từ ─────────────────
  // Cột: posting_date, voucher_date, voucher_no, kind, description,
  //      debit_account, credit_account, amount, line_no, sub.
  // Mua hàng/bán hàng lưu dòng hàng tiền (không lưu vế Nợ/Có) → suy bút toán:
  // mua = Nợ TK kho/chi phí + Nợ VAT / Có TK phải trả; bán = Nợ TK phải thu /
  // Có doanh thu + Có VAT (amount của dòng bán đã trừ chiết khấu, khớp cách
  // sales.service tính totalAmount).
  //
  // Khử trùng chứng từ dẫn xuất (1 nghiệp vụ sinh bản ghi ở 2 bảng, cùng
  // voucher_no và cùng định khoản — giữ chứng từ gốc, loại bản dẫn xuất):
  // - Phiếu thu SALES_CASH / thu tiền gửi SALES_BANK sinh từ bán hàng thu tiền
  //   ngay (định khoản đã nằm ở sales_voucher_lines, Nợ 111x-112x/Có 511x).
  // - Phiếu nhập kho sinh từ mua hàng qua kho (định khoản Nợ 15x/Có 331 đã
  //   nằm ở purchase_voucher_lines, kèm cả vế VAT).
  private journalSql(): Prisma.Sql {
    return Prisma.sql`
      SELECT v.posting_date, v.voucher_date, v.voucher_no,
             CASE WHEN v.type = 'RECEIPT' THEN 'CASH_RECEIPT' ELSE 'CASH_PAYMENT' END AS kind,
             COALESCE(l.description, v.reason) AS description,
             l.debit_account, l.credit_account, l.amount, l.line_no, 0 AS sub
      FROM cash_voucher_lines l JOIN cash_vouchers v ON v.id = l.voucher_id
      WHERE v.category <> 'SALES_CASH' AND v.posted
      UNION ALL
      SELECT v.posting_date, v.voucher_date, v.voucher_no,
             CASE WHEN v.type = 'RECEIPT' THEN 'BANK_RECEIPT' ELSE 'BANK_PAYMENT' END,
             COALESCE(l.description, v.reason),
             l.debit_account, l.credit_account, l.amount, l.line_no, 0
      FROM bank_voucher_lines l JOIN bank_vouchers v ON v.id = l.voucher_id
      WHERE v.category <> 'SALES_BANK' AND v.posted
      UNION ALL
      SELECT v.posting_date, v.voucher_date, v.voucher_no, 'GENERAL',
             COALESCE(l.description, v.description),
             l.debit_account, l.credit_account, l.amount, l.line_no, 0
      FROM general_voucher_lines l JOIN general_vouchers v ON v.id = l.voucher_id
      WHERE v.posted
      UNION ALL
      SELECT v.posting_date, v.voucher_date, v.voucher_no, 'INVENTORY_RECEIPT',
             COALESCE(l.item_name, v.description),
             l.debit_account, l.credit_account, l.amount, l.line_no, 0
      FROM inventory_receipt_lines l JOIN inventory_receipts v ON v.id = l.receipt_id
      WHERE v.posted AND l.debit_account IS NOT NULL AND l.credit_account IS NOT NULL
        AND NOT (v.receipt_type = 'PURCHASE' AND EXISTS (
          SELECT 1 FROM purchase_vouchers p WHERE p.voucher_no = v.voucher_no
        ))
      UNION ALL
      SELECT v.posting_date, v.voucher_date, v.voucher_no, 'GOODS_ISSUE',
             COALESCE(l.item_name, v.description),
             l.debit_account, l.credit_account, l.amount, l.line_no, 0
      FROM goods_issue_lines l JOIN goods_issue_vouchers v ON v.id = l.voucher_id
      WHERE v.posted
      UNION ALL
      SELECT v.posting_date, v.voucher_date, v.voucher_no, 'PURCHASE',
             COALESCE(l.item_name, v.description),
             e.debit_account, e.credit_account, e.amount, l.line_no, e.sub
      FROM purchase_voucher_lines l JOIN purchase_vouchers v ON v.id = l.voucher_id
      CROSS JOIN LATERAL (VALUES
        (l.stock_account, l.payable_account, l.amount, 1),
        (l.vat_account, l.payable_account, l.vat_amount, 2)
      ) AS e(debit_account, credit_account, amount, sub)
      WHERE v.posted AND e.debit_account IS NOT NULL AND e.amount <> 0
      UNION ALL
      SELECT v.posting_date, v.voucher_date, v.voucher_no, 'SALES',
             COALESCE(l.item_name, v.description),
             e.debit_account, e.credit_account, e.amount, l.line_no, e.sub
      FROM sales_voucher_lines l JOIN sales_vouchers v ON v.id = l.voucher_id
      CROSS JOIN LATERAL (VALUES
        (l.debt_account, l.revenue_account, l.amount, 1),
        (l.debt_account, l.vat_account, l.vat_amount, 2)
      ) AS e(debit_account, credit_account, amount, sub)
      WHERE v.posted AND e.amount <> 0
    `
  }
}

function kindLabel(kind: string): string {
  return VOUCHER_KIND_LABELS[kind] ?? kind
}

// Tách số dư có dấu (dương = dư Nợ) về đúng cặp cột Nợ/Có.
function splitBalance<D extends string, C extends string>(
  balance: Prisma.Decimal,
  debitKey: D,
  creditKey: C,
): Record<D | C, string> {
  return {
    [debitKey]: balance.gte(0) ? balance.toString() : '0',
    [creditKey]: balance.lt(0) ? balance.neg().toString() : '0',
  } as Record<D | C, string>
}

// Kỳ báo cáo → Date (cột kiểu DATE, bỏ giờ).
function parseRange(filter: { fromDate: string; toDate: string }): { from: Date; to: Date } {
  const from = new Date(filter.fromDate)
  const to = new Date(filter.toDate)
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException('Từ ngày phải nhỏ hơn hoặc bằng đến ngày')
  }
  return { from, to }
}
