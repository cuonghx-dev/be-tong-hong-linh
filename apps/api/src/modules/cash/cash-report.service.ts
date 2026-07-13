import type {
  CashBookReportDto,
  CashBookRowDto,
  CashJournalReportDto,
  DailyBalanceReportDto,
  DailyBalanceRowDto,
} from '@app/shared'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CashReportFilterDto } from './dto/cash-report-filter.dto'

const ZERO = new Prisma.Decimal(0)
// Mọi TK con của 111 (1111, 1112…) đều thuộc quỹ tiền mặt.
const CASH_LIKE = `${CHART_OF_ACCOUNTS.CASH}%`

// Dòng hạch toán thu/chi tiền mặt trả về từ SQL (ngày ép ::text → 'yyyy-mm-dd').
interface RawLine {
  voucher_id: string
  posting_date: string
  voucher_date: string
  voucher_no: string
  description: string | null
  counter_account: string
  kind: 'RECEIPT' | 'PAYMENT'
  amount: string
}

// Báo cáo phân hệ Tiền mặt: sổ nhật ký thu/chi (S03a1/S03a2-DNN), sổ chi tiết
// quỹ, bảng kê số dư theo ngày. Số liệu lấy từ cash_voucher_lines theo TK 111
// (thu = ghi Nợ 111x, chi = ghi Có 111x); số dư đầu kỳ = số dư khai báo
// (account_opening_balances) + phát sinh trước kỳ.
@Injectable()
export class CashReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── S03a1-DNN: Sổ nhật ký thu tiền ─────────────────────────────────────────
  async receiptJournal(filter: CashReportFilterDto): Promise<CashJournalReportDto> {
    return this.journal(filter, 'RECEIPT')
  }

  // ── S03a2-DNN: Sổ nhật ký chi tiền ─────────────────────────────────────────
  async paymentJournal(filter: CashReportFilterDto): Promise<CashJournalReportDto> {
    return this.journal(filter, 'PAYMENT')
  }

  private async journal(
    filter: CashReportFilterDto,
    kind: 'RECEIPT' | 'PAYMENT',
  ): Promise<CashJournalReportDto> {
    const { from, to } = parseRange(filter)
    const lines = (await this.linesInRange(from, to)).filter((l) => l.kind === kind)

    let total = ZERO
    const rows = lines.map((l) => {
      total = total.add(l.amount)
      return {
        voucherId: l.voucher_id,
        postingDate: l.posting_date,
        voucherDate: l.voucher_date,
        voucherNo: l.voucher_no,
        description: l.description,
        counterAccount: l.counter_account,
        amount: l.amount,
      }
    })

    return { fromDate: filter.fromDate, toDate: filter.toDate, totalAmount: total.toString(), rows }
  }

  // ── Sổ kế toán chi tiết quỹ tiền mặt ───────────────────────────────────────
  async cashBook(filter: CashReportFilterDto): Promise<CashBookReportDto> {
    const { from, to } = parseRange(filter)
    const [opening, lines] = await Promise.all([
      this.openingCashBalance(from),
      this.linesInRange(from, to),
    ])

    let balance = opening
    let totalReceipt = ZERO
    let totalPayment = ZERO
    const rows: CashBookRowDto[] = lines.map((l) => {
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
        postingDate: l.posting_date,
        voucherDate: l.voucher_date,
        receiptNo: isReceipt ? l.voucher_no : null,
        paymentNo: isReceipt ? null : l.voucher_no,
        description: l.description,
        counterAccount: l.counter_account,
        receiptAmount: isReceipt ? l.amount : '0',
        paymentAmount: isReceipt ? '0' : l.amount,
        balance: balance.toString(),
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

  // ── Bảng kê số dư tiền theo ngày (chỉ ngày có phát sinh) ───────────────────
  async dailyBalance(filter: CashReportFilterDto): Promise<DailyBalanceReportDto> {
    const { from, to } = parseRange(filter)
    const [opening, daily] = await Promise.all([
      this.openingCashBalance(from),
      this.prisma.$queryRaw<{ d: string; receipt: string; payment: string }[]>(Prisma.sql`
        SELECT v.posting_date::text AS d,
               COALESCE(SUM(l.amount) FILTER (WHERE l.debit_account LIKE ${CASH_LIKE}), 0)::text AS receipt,
               COALESCE(SUM(l.amount) FILTER (WHERE l.credit_account LIKE ${CASH_LIKE}), 0)::text AS payment
        FROM cash_voucher_lines l
        JOIN cash_vouchers v ON v.id = l.voucher_id
        WHERE v.posted
          AND v.posting_date BETWEEN ${from} AND ${to}
          AND (l.debit_account LIKE ${CASH_LIKE} OR l.credit_account LIKE ${CASH_LIKE})
        GROUP BY v.posting_date
        ORDER BY v.posting_date
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

  // Dòng hạch toán chạm TK 111 trong kỳ, thứ tự ghi sổ. Dòng chuyển nội bộ
  // giữa 2 TK 111x sinh ra cả dòng thu lẫn dòng chi (đúng bản chất sổ quỹ).
  private async linesInRange(from: Date, to: Date): Promise<RawLine[]> {
    return this.prisma.$queryRaw<RawLine[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             v.posting_date::text AS posting_date,
             v.voucher_date::text AS voucher_date,
             v.voucher_no,
             COALESCE(l.description, v.reason) AS description,
             CASE WHEN k.kind = 'RECEIPT' THEN l.credit_account ELSE l.debit_account END AS counter_account,
             k.kind,
             l.amount::text AS amount
      FROM cash_voucher_lines l
      JOIN cash_vouchers v ON v.id = l.voucher_id
      CROSS JOIN LATERAL (
        VALUES ('RECEIPT'), ('PAYMENT')
      ) AS k(kind)
      WHERE v.posted
        AND v.posting_date BETWEEN ${from} AND ${to}
        AND (
          (k.kind = 'RECEIPT' AND l.debit_account LIKE ${CASH_LIKE})
          OR (k.kind = 'PAYMENT' AND l.credit_account LIKE ${CASH_LIKE})
        )
      ORDER BY v.posting_date, v.voucher_no, l.line_no, k.kind
    `)
  }

  // Số dư quỹ tiền mặt đầu kỳ = số dư khai báo TK 111 + phát sinh trước `from`.
  // account_opening_balances lưu cả TK tổng hợp lẫn chi tiết, không cộng dồn
  // cha-con → ưu tiên dòng '111'; thiếu mới cộng các dòng con '111x'.
  private async openingCashBalance(from: Date): Promise<Prisma.Decimal> {
    const [declared, movement] = await Promise.all([
      this.prisma.$queryRaw<{ s: string }[]>(Prisma.sql`
        SELECT COALESCE(
          (SELECT debit_amount - credit_amount FROM account_opening_balances
           WHERE account_code = ${CHART_OF_ACCOUNTS.CASH}),
          (SELECT COALESCE(SUM(debit_amount - credit_amount), 0) FROM account_opening_balances
           WHERE account_code LIKE ${CASH_LIKE} AND account_code <> ${CHART_OF_ACCOUNTS.CASH})
        )::text AS s
      `),
      this.prisma.$queryRaw<{ s: string }[]>(Prisma.sql`
        SELECT COALESCE(SUM(
          CASE WHEN l.debit_account LIKE ${CASH_LIKE} THEN l.amount ELSE 0 END
          - CASE WHEN l.credit_account LIKE ${CASH_LIKE} THEN l.amount ELSE 0 END
        ), 0)::text AS s
        FROM cash_voucher_lines l
        JOIN cash_vouchers v ON v.id = l.voucher_id
        WHERE v.posted
          AND v.posting_date < ${from}
          AND (l.debit_account LIKE ${CASH_LIKE} OR l.credit_account LIKE ${CASH_LIKE})
      `),
    ])
    return new Prisma.Decimal(declared[0]?.s ?? 0).add(movement[0]?.s ?? 0)
  }
}

// Kỳ báo cáo → Date (cột kiểu DATE, bỏ giờ).
function parseRange(filter: CashReportFilterDto): { from: Date; to: Date } {
  const from = new Date(filter.fromDate)
  const to = new Date(filter.toDate)
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException('Từ ngày phải nhỏ hơn hoặc bằng đến ngày')
  }
  return { from, to }
}
