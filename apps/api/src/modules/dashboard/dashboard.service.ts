import type {
  CashflowReportDto,
  DashboardPeriod,
  DebtAgingDto,
  ExpenseBreakdownDto,
  FinanceOverviewDto,
  InventorySummaryDto,
  OnboardingProgressDto,
  OnboardingTaskKey,
  ProfitLossReportDto,
  TopSellingReportDto,
} from '@app/shared'
import { ONBOARDING_TASK_KEYS } from '@app/shared'
import { Injectable } from '@nestjs/common'
import { BankVoucherType, CashVoucherType, PartnerType, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

const ZERO = new Prisma.Decimal(0)

// Nhóm TK chi phí → nhãn hiển thị (cơ cấu chi phí, §TT133/200).
const EXPENSE_GROUPS: { key: string; label: string; prefixes: string[] }[] = [
  { key: 'production', label: 'Chi phí sản xuất', prefixes: ['154', '621', '622', '623', '627'] },
  { key: 'cogs', label: 'Giá vốn hàng bán', prefixes: ['632'] },
  { key: 'selling', label: 'Chi phí bán hàng', prefixes: ['641'] },
  { key: 'admin', label: 'Chi phí quản lý DN', prefixes: ['642'] },
  { key: 'finance', label: 'Chi phí tài chính', prefixes: ['635'] },
  { key: 'other', label: 'Chi phí khác', prefixes: [] }, // các TK 6xx/8xx còn lại
]

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tình hình tài chính ────────────────────────────────────────────────────
  // Số dư (tiền, công nợ, tồn kho) tính đến hiện tại; doanh thu/chi phí theo kỳ.
  async financeOverview(period: DashboardPeriod): Promise<FinanceOverviewDto> {
    const { from, to } = periodRange(period)

    const [cash, bank, receivable, payable, inventory, revenueAgg, expense] = await Promise.all([
      this.moneyBalance('cash'),
      this.moneyBalance('bank'),
      this.receivableAging(),
      this.payableAging(),
      this.inventoryTotal(),
      this.prisma.salesVoucher.aggregate({
        _sum: { totalGoods: true },
        where: { postingDate: { gte: from, lte: to }, posted: true },
      }),
      this.expenseTotal(from, to),
    ])

    const revenue = revenueAgg._sum.totalGoods ?? ZERO
    return {
      cash: cash.toString(),
      bank: bank.toString(),
      receivable: receivable.total,
      payable: payable.total,
      inventory: inventory.toString(),
      revenue: revenue.toString(),
      expense: expense.toString(),
      profit: revenue.sub(expense).toString(),
    }
  }

  // ── Nợ phải thu theo hạn ───────────────────────────────────────────────────
  // Chứng từ bán hàng chưa thu; quá hạn khi hạn thanh toán (mặc định ngày CT) < hôm nay.
  async receivableAging(): Promise<DebtAgingDto> {
    const rows = await this.prisma.$queryRaw<{ total: string; overdue: string }[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(total_amount), 0)::text AS total,
        COALESCE(SUM(total_amount) FILTER (
          WHERE COALESCE(due_date, voucher_date) < CURRENT_DATE
        ), 0)::text AS overdue
      FROM sales_vouchers
      WHERE payment_mode = 'UNPAID'
    `)
    return toAging(rows[0])
  }

  // ── Nợ phải trả theo hạn ───────────────────────────────────────────────────
  async payableAging(): Promise<DebtAgingDto> {
    const rows = await this.prisma.$queryRaw<{ total: string; overdue: string }[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(total_payment), 0)::text AS total,
        COALESCE(SUM(total_payment) FILTER (
          WHERE COALESCE(due_date, voucher_date) < CURRENT_DATE
        ), 0)::text AS overdue
      FROM purchase_vouchers
      WHERE payment_status <> 'PAID' AND payment_mode = 'UNPAID'
    `)
    return toAging(rows[0])
  }

  // ── Doanh thu, chi phí, lợi nhuận theo tháng ───────────────────────────────
  async profitLoss(year: number): Promise<ProfitLossReportDto> {
    const { from, to } = yearRange(year)

    const [revenueRows, expenseRows] = await Promise.all([
      this.prisma.$queryRaw<{ m: number; s: string }[]>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM posting_date)::int AS m, COALESCE(SUM(total_goods), 0)::text AS s
        FROM sales_vouchers
        WHERE posting_date BETWEEN ${from} AND ${to}
        GROUP BY 1
      `),
      this.prisma.$queryRaw<{ m: number; s: string }[]>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM d)::int AS m, COALESCE(SUM(amt), 0)::text AS s
        FROM (${this.expenseLinesSql(from, to)}) e
        GROUP BY 1
      `),
    ])

    const revenueByMonth = byMonth(revenueRows)
    const expenseByMonth = byMonth(expenseRows)
    let totalRevenue = ZERO
    let totalExpense = ZERO

    const months = Array.from({ length: 12 }, (_, i) => {
      const revenue = revenueByMonth.get(i + 1) ?? ZERO
      const expense = expenseByMonth.get(i + 1) ?? ZERO
      totalRevenue = totalRevenue.add(revenue)
      totalExpense = totalExpense.add(expense)
      return {
        month: i + 1,
        revenue: revenue.toString(),
        expense: expense.toString(),
        profit: revenue.sub(expense).toString(),
      }
    })

    return {
      year,
      totalRevenue: totalRevenue.toString(),
      totalExpense: totalExpense.toString(),
      totalProfit: totalRevenue.sub(totalExpense).toString(),
      months,
    }
  }

  // ── Dòng tiền theo tháng (tiền mặt + tiền gửi) ─────────────────────────────
  // Tồn cuối tháng = số dư đầu năm + lũy kế thu − chi tới tháng đó.
  async cashflow(year: number): Promise<CashflowReportDto> {
    const { from, to } = yearRange(year)

    const [monthly, openingRows] = await Promise.all([
      this.prisma.$queryRaw<{ m: number; t: string; s: string }[]>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM posting_date)::int AS m, t,
               COALESCE(SUM(total_amount), 0)::text AS s
        FROM (
          SELECT posting_date, type::text AS t, total_amount FROM cash_vouchers
          UNION ALL
          SELECT posting_date, type::text, total_amount FROM bank_vouchers
        ) v
        WHERE posting_date BETWEEN ${from} AND ${to}
        GROUP BY 1, 2
      `),
      this.prisma.$queryRaw<{ t: string; s: string }[]>(Prisma.sql`
        SELECT t, COALESCE(SUM(total_amount), 0)::text AS s
        FROM (
          SELECT posting_date, type::text AS t, total_amount FROM cash_vouchers
          UNION ALL
          SELECT posting_date, type::text, total_amount FROM bank_vouchers
        ) v
        WHERE posting_date < ${from}
        GROUP BY 1
      `),
    ])

    let balance = openingRows.reduce(
      (acc, r) => (r.t === 'RECEIPT' ? acc.add(r.s) : acc.sub(r.s)),
      ZERO,
    )

    const inflowByMonth = new Map<number, Prisma.Decimal>()
    const outflowByMonth = new Map<number, Prisma.Decimal>()
    for (const r of monthly) {
      const target = r.t === 'RECEIPT' ? inflowByMonth : outflowByMonth
      target.set(r.m, (target.get(r.m) ?? ZERO).add(r.s))
    }

    let totalInflow = ZERO
    let totalOutflow = ZERO
    const months = Array.from({ length: 12 }, (_, i) => {
      const inflow = inflowByMonth.get(i + 1) ?? ZERO
      const outflow = outflowByMonth.get(i + 1) ?? ZERO
      totalInflow = totalInflow.add(inflow)
      totalOutflow = totalOutflow.add(outflow)
      balance = balance.add(inflow).sub(outflow)
      return {
        month: i + 1,
        inflow: inflow.toString(),
        outflow: outflow.toString(),
        balance: balance.toString(),
      }
    })

    return {
      year,
      totalInflow: totalInflow.toString(),
      totalOutflow: totalOutflow.toString(),
      balance: balance.toString(),
      months,
    }
  }

  // ── Hàng hóa tồn kho — top theo giá trị ────────────────────────────────────
  // Tồn = khai báo đầu kỳ + Σ nhập − Σ xuất (chỉ chứng từ đã ghi sổ, bỏ dòng
  // đại diện nhập khẩu không có mã hàng). Khớp logic báo cáo Kho (StockSummary).
  async inventorySummary(limit = 5): Promise<InventorySummaryDto> {
    const [total, items] = await Promise.all([
      this.inventoryTotal(),
      this.prisma.$queryRaw<{ item_name: string; quantity: string; value: string }[]>(Prisma.sql`
        WITH opening AS (
          SELECT p.code AS item_code, p.name AS item_name,
                 SUM(b.quantity) AS qty, SUM(b.amount) AS amt
          FROM inventory_opening_balances b
          JOIN products p ON p.id = b.product_id
          GROUP BY p.code, p.name
        ),
        receipt AS (
          SELECT l.item_id AS item_code, SUM(l.quantity) AS qty, SUM(l.amount) AS amt
          FROM inventory_receipt_lines l
          JOIN inventory_receipts v ON v.id = l.receipt_id
          WHERE v.posted AND COALESCE(l.item_id, '') <> ''
          GROUP BY l.item_id
        ),
        issue AS (
          SELECT l.item_id AS item_code, SUM(l.quantity) AS qty, SUM(l.amount) AS amt
          FROM goods_issue_lines l
          JOIN goods_issue_vouchers v ON v.id = l.voucher_id
          WHERE v.posted AND COALESCE(l.item_id, '') <> ''
          GROUP BY l.item_id
        ),
        codes AS (
          SELECT item_code FROM opening
          UNION SELECT item_code FROM receipt
          UNION SELECT item_code FROM issue
        )
        SELECT
          COALESCE(o.item_name, p.name) AS item_name,
          (COALESCE(o.qty, 0) + COALESCE(r.qty, 0) - COALESCE(i.qty, 0))::text AS quantity,
          (COALESCE(o.amt, 0) + COALESCE(r.amt, 0) - COALESCE(i.amt, 0))::text AS value
        FROM codes c
        LEFT JOIN opening o ON o.item_code = c.item_code
        LEFT JOIN receipt r ON r.item_code = c.item_code
        LEFT JOIN issue i ON i.item_code = c.item_code
        LEFT JOIN products p ON p.code = c.item_code
        ORDER BY (COALESCE(o.amt, 0) + COALESCE(r.amt, 0) - COALESCE(i.amt, 0)) DESC
        LIMIT ${limit}
      `),
    ])

    return {
      totalValue: total.toString(),
      items: items.map((r) => ({ itemName: r.item_name, quantity: r.quantity, value: r.value })),
    }
  }

  // ── Mặt hàng bán chạy — top theo doanh thu trong năm ───────────────────────
  async topSelling(year: number, limit = 5): Promise<TopSellingReportDto> {
    const { from, to } = yearRange(year)

    const [revenueAgg, items] = await Promise.all([
      this.prisma.salesVoucher.aggregate({
        _sum: { totalGoods: true },
        where: { postingDate: { gte: from, lte: to }, posted: true },
      }),
      this.prisma.$queryRaw<{ item_name: string; quantity: string; revenue: string }[]>(Prisma.sql`
        SELECT l.item_name, COALESCE(SUM(l.quantity), 0)::text AS quantity,
               COALESCE(SUM(l.amount), 0)::text AS revenue
        FROM sales_voucher_lines l
        JOIN sales_vouchers v ON v.id = l.voucher_id
        WHERE l.item_name IS NOT NULL AND v.posted AND v.posting_date BETWEEN ${from} AND ${to}
        GROUP BY l.item_name
        ORDER BY SUM(l.amount) DESC
        LIMIT ${limit}
      `),
    ])

    return {
      year,
      totalRevenue: (revenueAgg._sum.totalGoods ?? ZERO).toString(),
      items: items.map((r) => ({ itemName: r.item_name, quantity: r.quantity, revenue: r.revenue })),
    }
  }

  // ── Cơ cấu chi phí theo nhóm TK trong năm ──────────────────────────────────
  async expenseBreakdown(year: number): Promise<ExpenseBreakdownDto> {
    const { from, to } = yearRange(year)
    const rows = await this.prisma.$queryRaw<{ acct3: string; s: string }[]>(Prisma.sql`
      SELECT substring(acct, 1, 3) AS acct3, COALESCE(SUM(amt), 0)::text AS s
      FROM (${this.expenseLinesSql(from, to)}) e
      GROUP BY 1
    `)

    const sums = new Map<string, Prisma.Decimal>()
    let total = ZERO
    for (const r of rows) {
      const group = EXPENSE_GROUPS.find((g) => g.prefixes.includes(r.acct3))
      const key = group?.key ?? 'other'
      sums.set(key, (sums.get(key) ?? ZERO).add(r.s))
      total = total.add(r.s)
    }

    return {
      year,
      total: total.toString(),
      groups: EXPENSE_GROUPS.filter((g) => sums.has(g.key)).map((g) => ({
        key: g.key,
        label: g.label,
        amount: (sums.get(g.key) ?? ZERO).toString(),
      })),
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Số dư tiền mặt / tiền gửi = Σ phiếu thu − Σ phiếu chi (toàn thời gian).
  private async moneyBalance(kind: 'cash' | 'bank'): Promise<Prisma.Decimal> {
    const table = kind === 'cash' ? Prisma.raw('cash_vouchers') : Prisma.raw('bank_vouchers')
    const rows = await this.prisma.$queryRaw<{ s: string }[]>(Prisma.sql`
      SELECT COALESCE(SUM(CASE WHEN type = 'RECEIPT' THEN total_amount ELSE -total_amount END), 0)::text AS s
      FROM ${table}
    `)
    return new Prisma.Decimal(rows[0]?.s ?? 0)
  }

  // Giá trị tồn kho = khai báo đầu kỳ + Σ nhập − Σ xuất (toàn thời gian, chỉ
  // chứng từ đã ghi sổ, bỏ dòng đại diện nhập khẩu). Khớp báo cáo Kho.
  private async inventoryTotal(): Promise<Prisma.Decimal> {
    const rows = await this.prisma.$queryRaw<{ s: string }[]>(Prisma.sql`
      SELECT (
        (SELECT COALESCE(SUM(amount), 0) FROM inventory_opening_balances)
        + (SELECT COALESCE(SUM(l.amount), 0)
           FROM inventory_receipt_lines l
           JOIN inventory_receipts v ON v.id = l.receipt_id
           WHERE v.posted AND COALESCE(l.item_id, '') <> '')
        - (SELECT COALESCE(SUM(l.amount), 0)
           FROM goods_issue_lines l
           JOIN goods_issue_vouchers v ON v.id = l.voucher_id
           WHERE v.posted AND COALESCE(l.item_id, '') <> '')
      )::text AS s
    `)
    return new Prisma.Decimal(rows[0]?.s ?? 0)
  }

  private async expenseTotal(from: Date, to: Date): Promise<Prisma.Decimal> {
    const rows = await this.prisma.$queryRaw<{ s: string }[]>(Prisma.sql`
      SELECT COALESCE(SUM(amt), 0)::text AS s FROM (${this.expenseLinesSql(from, to)}) e
    `)
    return new Prisma.Decimal(rows[0]?.s ?? 0)
  }

  // Phát sinh Nợ các TK chi phí (6xx, 8xx) gom từ mọi loại chứng từ có định khoản.
  private expenseLinesSql(from: Date, to: Date): Prisma.Sql {
    return Prisma.sql`
      SELECT v.posting_date AS d, l.debit_account AS acct, l.amount AS amt
      FROM cash_voucher_lines l JOIN cash_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account ~ '^(6|8)' AND v.posting_date BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT v.posting_date, l.debit_account, l.amount
      FROM bank_voucher_lines l JOIN bank_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account ~ '^(6|8)' AND v.posting_date BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT v.posting_date, l.debit_account, l.amount
      FROM general_voucher_lines l JOIN general_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account ~ '^(6|8)' AND v.posting_date BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT v.posting_date, l.debit_account, l.amount
      FROM goods_issue_lines l JOIN goods_issue_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account ~ '^(6|8)' AND v.posting_date BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT v.posting_date, l.stock_account, l.amount
      FROM purchase_voucher_lines l JOIN purchase_vouchers v ON v.id = l.voucher_id
      WHERE l.stock_account ~ '^(6|8)' AND v.posting_date BETWEEN ${from} AND ${to}
    `
  }

  // ── Tiến độ thiết lập ban đầu (tutorial "Bắt đầu sử dụng") ─────────────────
  // Mỗi việc = 1 count; gom trong 1 $transaction để chỉ tốn 1 round-trip.
  async onboardingProgress(): Promise<OnboardingProgressDto> {
    const counts = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.employee.count(),
      this.prisma.organizationUnit.count(),
      this.prisma.customer.count(),
      this.prisma.supplier.count(),
      this.prisma.product.count(),
      this.prisma.warehouse.count(),
      this.prisma.bankAccount.count(),
      this.prisma.account.count(),
      this.prisma.accountOpeningBalance.count(),
      this.prisma.bankAccountOpeningBalance.count(),
      this.prisma.partnerOpeningBalance.count({ where: { partnerType: PartnerType.CUSTOMER } }),
      this.prisma.partnerOpeningBalance.count({ where: { partnerType: PartnerType.SUPPLIER } }),
      this.prisma.inventoryOpeningBalance.count(),
      this.prisma.fixedAssetOpeningBalance.count(),
      this.prisma.cashVoucher.count({ where: { type: CashVoucherType.RECEIPT } }),
      this.prisma.cashVoucher.count({ where: { type: CashVoucherType.PAYMENT } }),
      this.prisma.bankVoucher.count({ where: { type: BankVoucherType.RECEIPT } }),
      this.prisma.bankVoucher.count({ where: { type: BankVoucherType.PAYMENT } }),
      this.prisma.purchaseVoucher.count(),
      this.prisma.salesVoucher.count(),
      this.prisma.inventoryReceipt.count(),
      this.prisma.goodsIssueVoucher.count(),
      this.prisma.generalVoucher.count(),
    ])

    // counts[i] khớp thứ tự ONBOARDING_TASK_KEYS — sửa 1 bên phải sửa bên kia.
    const tasks = {} as Record<OnboardingTaskKey, boolean>
    ONBOARDING_TASK_KEYS.forEach((key, i) => {
      // Tài khoản quản trị đầu tiên không tính → 'users' cần > 1.
      tasks[key] = (counts[i] ?? 0) > (key === 'users' ? 1 : 0)
    })
    return { tasks }
  }
}

// ── Date helpers (UTC, bỏ giờ — cột kiểu DATE) ────────────────────────────────

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function periodRange(period: DashboardPeriod): { from: Date; to: Date } {
  const now = new Date()
  const y = now.getUTCFullYear()
  if (period === 'year') return yearRange(y)
  if (period === 'quarter') {
    const q = Math.floor(now.getUTCMonth() / 3)
    return {
      from: new Date(Date.UTC(y, q * 3, 1)),
      to: new Date(Date.UTC(y, q * 3 + 3, 0)),
    }
  }
  return {
    from: new Date(Date.UTC(y, now.getUTCMonth(), 1)),
    to: new Date(Date.UTC(y, now.getUTCMonth() + 1, 0)),
  }
}

function yearRange(year: number): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31)) }
}

function toAging(row?: { total: string; overdue: string }): DebtAgingDto {
  const total = new Prisma.Decimal(row?.total ?? 0)
  const overdue = new Prisma.Decimal(row?.overdue ?? 0)
  return { total: total.toString(), overdue: overdue.toString(), current: total.sub(overdue).toString() }
}

function byMonth(rows: { m: number; s: string }[]): Map<number, Prisma.Decimal> {
  return new Map(rows.map((r) => [r.m, new Prisma.Decimal(r.s)]))
}
