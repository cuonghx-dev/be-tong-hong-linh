import type {
  CustomerReceivableDetailGroupDto,
  CustomerReceivableDetailReportDto,
  CustomerReceivableSource,
  CustomerReceivableSummaryReportDto,
  CustomerReceivableSummaryRowDto,
  SalesByItemReportDto,
  SalesDetailReportDto,
} from '@app/shared'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { SalesReportFilterDto } from './dto/sales-report-filter.dto'

const ZERO = new Prisma.Decimal(0)
// Mọi TK con của 131 (1311, 1312…) đều là phải thu khách hàng.
const RECEIVABLE_LIKE = `${CHART_OF_ACCOUNTS.RECEIVABLE}%`

// Dòng hàng chứng từ bán trả về từ SQL (ngày ép ::text → 'yyyy-mm-dd').
interface RawDetailRow {
  voucher_id: string
  posting_date: string
  voucher_date: string
  voucher_no: string
  customer_name: string | null
  description: string | null
  item_name: string | null
  unit: string | null
  quantity: string
  unit_price: string
  discount: string
  amount: string
  vat_amount: string
}

// 1 dòng phát sinh công nợ 131: DEBIT = chứng từ bán chưa thu (Nợ 131),
// CREDIT = phiếu thu tiền mặt/tiền gửi (Có 131); chứng từ NVK có cả 2 chiều.
interface RawReceivableRow {
  voucher_id: string
  source: CustomerReceivableSource
  kind: 'DEBIT' | 'CREDIT'
  posting_date: string
  voucher_no: string
  description: string | null
  partner_id: string | null
  partner_name: string | null
  amount: string
}

// Thông tin KH sau khi quy về 1 khóa gộp (id nếu có, fallback tên).
interface CustomerKey {
  key: string
  customerId: string | null
  customerCode: string | null
  customerName: string
}

// Nhóm số liệu công nợ tích lũy theo KH.
interface ReceivableBucket extends Omit<CustomerKey, 'key'> {
  opening: Prisma.Decimal
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  rows: RawReceivableRow[]
}

// Báo cáo phân hệ Bán hàng: sổ chi tiết bán hàng, tổng hợp theo mặt hàng,
// tổng hợp + chi tiết công nợ phải thu KH (TK 131).
// Quy ước công nợ (đối xứng purchase-report): chứng từ bán payment_mode=UNPAID
// mới ghi Nợ 131 (bán thu ngay hạch toán thẳng 111/112, không qua công nợ);
// phát sinh Có 131 lấy từ dòng hạch toán phiếu thu tiền mặt/tiền gửi; chứng từ
// NVK hạch toán 131 tính cả 2 chiều; dư đầu kỳ = số dư khai báo
// (partner_opening_balances) + phát sinh trước kỳ.
@Injectable()
export class SalesReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Sổ chi tiết bán hàng ───────────────────────────────────────────────────
  async detail(filter: SalesReportFilterDto): Promise<SalesDetailReportDto> {
    const { from, to } = parseRange(filter)
    const lines = await this.prisma.$queryRaw<RawDetailRow[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             v.posting_date::text AS posting_date,
             v.voucher_date::text AS voucher_date,
             v.voucher_no,
             v.customer_name,
             v.description,
             l.item_name,
             l.unit,
             l.quantity::text AS quantity,
             l.unit_price::text AS unit_price,
             l.trade_discount::text AS discount,
             l.amount::text AS amount,
             l.vat_amount::text AS vat_amount
      FROM sales_voucher_lines l
      JOIN sales_vouchers v ON v.id = l.voucher_id
      WHERE v.posting_date BETWEEN ${from} AND ${to}
      ORDER BY v.posting_date, v.voucher_no, l.line_no
    `)

    let totalDiscount = ZERO
    let totalAmount = ZERO
    let totalVat = ZERO
    const rows = lines.map((l) => {
      totalDiscount = totalDiscount.add(l.discount)
      totalAmount = totalAmount.add(l.amount)
      totalVat = totalVat.add(l.vat_amount)
      return {
        voucherId: l.voucher_id,
        postingDate: l.posting_date,
        voucherDate: l.voucher_date,
        voucherNo: l.voucher_no,
        customerName: l.customer_name,
        description: l.description,
        itemName: l.item_name,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unit_price,
        discount: l.discount,
        amount: l.amount,
        vatAmount: l.vat_amount,
        totalPayment: new Prisma.Decimal(l.amount).add(l.vat_amount).toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalDiscount: totalDiscount.toString(),
      totalAmount: totalAmount.toString(),
      totalVat: totalVat.toString(),
      totalPayment: totalAmount.add(totalVat).toString(),
      rows,
    }
  }

  // ── Tổng hợp bán hàng theo mặt hàng ────────────────────────────────────────
  async byItem(filter: SalesReportFilterDto): Promise<SalesByItemReportDto> {
    const { from, to } = parseRange(filter)
    const groups = await this.prisma.$queryRaw<
      {
        item_id: string | null
        item_code: string | null
        item_name: string | null
        unit: string | null
        quantity: string
        discount: string
        amount: string
        vat_amount: string
      }[]
    >(Prisma.sql`
      SELECT l.item_id,
             p.code AS item_code,
             l.item_name,
             l.unit,
             SUM(l.quantity)::text AS quantity,
             SUM(l.trade_discount)::text AS discount,
             SUM(l.amount)::text AS amount,
             SUM(l.vat_amount)::text AS vat_amount
      FROM sales_voucher_lines l
      JOIN sales_vouchers v ON v.id = l.voucher_id
      LEFT JOIN products p ON p.id = l.item_id
      WHERE v.posting_date BETWEEN ${from} AND ${to}
      GROUP BY l.item_id, p.code, l.item_name, l.unit
      ORDER BY l.item_name NULLS LAST
    `)

    let totalDiscount = ZERO
    let totalAmount = ZERO
    let totalVat = ZERO
    const rows = groups.map((g) => {
      totalDiscount = totalDiscount.add(g.discount)
      totalAmount = totalAmount.add(g.amount)
      totalVat = totalVat.add(g.vat_amount)
      return {
        itemId: g.item_id,
        itemCode: g.item_code,
        itemName: g.item_name,
        unit: g.unit,
        quantity: g.quantity,
        discount: g.discount,
        amount: g.amount,
        vatAmount: g.vat_amount,
        total: new Prisma.Decimal(g.amount).add(g.vat_amount).toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalDiscount: totalDiscount.toString(),
      totalAmount: totalAmount.toString(),
      totalVat: totalVat.toString(),
      totalPayment: totalAmount.add(totalVat).toString(),
      rows,
    }
  }

  // ── Tổng hợp công nợ phải thu KH ───────────────────────────────────────────
  async receivableSummary(
    filter: SalesReportFilterDto,
  ): Promise<CustomerReceivableSummaryReportDto> {
    const buckets = await this.receivableBuckets(filter)

    let totalOpening = ZERO
    let totalDebit = ZERO
    let totalCredit = ZERO
    let totalClosing = ZERO
    const rows: CustomerReceivableSummaryRowDto[] = buckets.map((b) => {
      const closing = b.opening.add(b.debit).sub(b.credit)
      totalOpening = totalOpening.add(b.opening)
      totalDebit = totalDebit.add(b.debit)
      totalCredit = totalCredit.add(b.credit)
      totalClosing = totalClosing.add(closing)
      return {
        customerId: b.customerId,
        customerCode: b.customerCode,
        customerName: b.customerName,
        openingBalance: b.opening.toString(),
        debitAmount: b.debit.toString(),
        creditAmount: b.credit.toString(),
        closingBalance: closing.toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalOpening: totalOpening.toString(),
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      totalClosing: totalClosing.toString(),
      rows,
    }
  }

  // ── Chi tiết công nợ phải thu KH ───────────────────────────────────────────
  async receivableDetail(
    filter: SalesReportFilterDto,
  ): Promise<CustomerReceivableDetailReportDto> {
    const buckets = await this.receivableBuckets(filter)

    let totalOpening = ZERO
    let totalDebit = ZERO
    let totalCredit = ZERO
    let totalClosing = ZERO
    const groups: CustomerReceivableDetailGroupDto[] = buckets.map((b) => {
      // Gộp các dòng hạch toán cùng chứng từ + cùng chiều thành 1 dòng sổ.
      const merged = new Map<string, RawReceivableRow & { total: Prisma.Decimal }>()
      for (const r of b.rows) {
        const k = `${r.voucher_id}:${r.kind}`
        const cur = merged.get(k)
        if (cur) cur.total = cur.total.add(r.amount)
        else merged.set(k, { ...r, total: new Prisma.Decimal(r.amount) })
      }

      let balance = b.opening
      const rows = [...merged.values()]
        .sort((x, y) =>
          x.posting_date === y.posting_date
            ? x.voucher_no.localeCompare(y.voucher_no)
            : x.posting_date.localeCompare(y.posting_date),
        )
        .map((r) => {
          const isDebit = r.kind === 'DEBIT'
          balance = isDebit ? balance.add(r.total) : balance.sub(r.total)
          return {
            voucherId: r.voucher_id,
            source: r.source,
            postingDate: r.posting_date,
            voucherNo: r.voucher_no,
            description: r.description,
            debitAmount: isDebit ? r.total.toString() : '0',
            creditAmount: isDebit ? '0' : r.total.toString(),
            balance: balance.toString(),
          }
        })

      const closing = b.opening.add(b.debit).sub(b.credit)
      totalOpening = totalOpening.add(b.opening)
      totalDebit = totalDebit.add(b.debit)
      totalCredit = totalCredit.add(b.credit)
      totalClosing = totalClosing.add(closing)
      return {
        customerId: b.customerId,
        customerCode: b.customerCode,
        customerName: b.customerName,
        openingBalance: b.opening.toString(),
        debitAmount: b.debit.toString(),
        creditAmount: b.credit.toString(),
        closingBalance: closing.toString(),
        rows,
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalOpening: totalOpening.toString(),
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      totalClosing: totalClosing.toString(),
      groups,
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Gom công nợ 131 theo KH: dư đầu (khai báo + phát sinh trước kỳ) + phát sinh
  // trong kỳ (kèm dòng chứng từ cho báo cáo chi tiết). Sắp theo tên KH.
  private async receivableBuckets(filter: SalesReportFilterDto): Promise<ReceivableBucket[]> {
    const { from, to } = parseRange(filter)
    const [customers, declared, before, inRange] = await Promise.all([
      this.prisma.customer.findMany({ select: { id: true, code: true, name: true } }),
      this.prisma.$queryRaw<{ partner_id: string; balance: string }[]>(Prisma.sql`
        SELECT partner_id, SUM(debit_amount - credit_amount)::text AS balance
        FROM partner_opening_balances
        WHERE partner_type = 'CUSTOMER' AND account_code LIKE ${RECEIVABLE_LIKE}
        GROUP BY partner_id
      `),
      this.receivableRows(Prisma.sql`v.posting_date < ${from}`),
      this.receivableRows(Prisma.sql`v.posting_date BETWEEN ${from} AND ${to}`),
    ])

    // Quy chứng từ về 1 KH: ưu tiên id; chỉ có tên (dữ liệu nhập khẩu) thì match
    // đúng tên trong danh mục để nhập chung nhóm, không khớp thì nhóm theo tên.
    const byId = new Map(customers.map((c) => [c.id, c]))
    const byName = new Map(customers.map((c) => [normalizeName(c.name), c]))
    const resolve = (partnerId: string | null, partnerName: string | null): CustomerKey => {
      const matched =
        (partnerId && byId.get(partnerId)) ||
        (partnerName && byName.get(normalizeName(partnerName))) ||
        null
      if (matched) {
        return { key: matched.id, customerId: matched.id, customerCode: matched.code, customerName: matched.name }
      }
      const name = partnerName?.trim()
      if (name) return { key: `name:${normalizeName(name)}`, customerId: null, customerCode: null, customerName: name }
      return { key: 'unknown', customerId: null, customerCode: null, customerName: 'Không xác định' }
    }

    const buckets = new Map<string, ReceivableBucket>()
    const bucketOf = (k: CustomerKey): ReceivableBucket => {
      let b = buckets.get(k.key)
      if (!b) {
        b = {
          customerId: k.customerId,
          customerCode: k.customerCode,
          customerName: k.customerName,
          opening: ZERO,
          debit: ZERO,
          credit: ZERO,
          rows: [],
        }
        buckets.set(k.key, b)
      }
      return b
    }

    for (const d of declared) {
      const b = bucketOf(resolve(d.partner_id, null))
      b.opening = b.opening.add(d.balance)
    }
    for (const r of before) {
      const b = bucketOf(resolve(r.partner_id, r.partner_name))
      b.opening = r.kind === 'DEBIT' ? b.opening.add(r.amount) : b.opening.sub(r.amount)
    }
    for (const r of inRange) {
      const b = bucketOf(resolve(r.partner_id, r.partner_name))
      if (r.kind === 'DEBIT') b.debit = b.debit.add(r.amount)
      else b.credit = b.credit.add(r.amount)
      b.rows.push(r)
    }

    return [...buckets.values()]
      .filter((b) => filter.customerId === undefined || b.customerId === filter.customerId)
      .filter((b) => !b.opening.isZero() || !b.debit.isZero() || !b.credit.isZero())
      .sort((a, b) => a.customerName.localeCompare(b.customerName, 'vi'))
  }

  // Dòng phát sinh 131 từ 4 nguồn (UNION): chứng từ bán UNPAID ghi Nợ (tiền hàng
  // + thuế); phiếu thu tiền mặt / tiền gửi ghi Có; chứng từ NVK cả 2 chiều.
  // Đối tượng ưu tiên theo dòng, fallback header.
  private async receivableRows(dateCond: Prisma.Sql): Promise<RawReceivableRow[]> {
    return this.prisma.$queryRaw<RawReceivableRow[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             'SALES' AS source,
             'DEBIT' AS kind,
             v.posting_date::text AS posting_date,
             v.voucher_no,
             v.description,
             v.customer_id AS partner_id,
             v.customer_name AS partner_name,
             (l.amount + l.vat_amount)::text AS amount
      FROM sales_voucher_lines l
      JOIN sales_vouchers v ON v.id = l.voucher_id
      WHERE v.payment_mode = 'UNPAID'
        AND l.debt_account LIKE ${RECEIVABLE_LIKE}
        AND ${dateCond}
      UNION ALL
      SELECT v.id,
             'CASH',
             'CREDIT',
             v.posting_date::text,
             v.voucher_no,
             COALESCE(l.description, v.reason),
             COALESCE(l.partner_id, v.partner_id),
             COALESCE(l.partner_name, v.partner_name),
             l.amount::text
      FROM cash_voucher_lines l
      JOIN cash_vouchers v ON v.id = l.voucher_id
      WHERE l.credit_account LIKE ${RECEIVABLE_LIKE}
        AND ${dateCond}
      UNION ALL
      SELECT v.id,
             'BANK',
             'CREDIT',
             v.posting_date::text,
             v.voucher_no,
             COALESCE(l.description, v.reason),
             COALESCE(l.partner_id, v.partner_id),
             COALESCE(l.partner_name, v.partner_name),
             l.amount::text
      FROM bank_voucher_lines l
      JOIN bank_vouchers v ON v.id = l.voucher_id
      WHERE l.credit_account LIKE ${RECEIVABLE_LIKE}
        AND ${dateCond}
      UNION ALL
      SELECT v.id,
             'GENERAL',
             'DEBIT',
             v.posting_date::text,
             v.voucher_no,
             COALESCE(l.description, v.description),
             l.partner_id,
             l.partner_name,
             l.amount::text
      FROM general_voucher_lines l
      JOIN general_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account LIKE ${RECEIVABLE_LIKE}
        AND ${dateCond}
      UNION ALL
      SELECT v.id,
             'GENERAL',
             'CREDIT',
             v.posting_date::text,
             v.voucher_no,
             COALESCE(l.description, v.description),
             l.partner_id,
             l.partner_name,
             l.amount::text
      FROM general_voucher_lines l
      JOIN general_vouchers v ON v.id = l.voucher_id
      WHERE l.credit_account LIKE ${RECEIVABLE_LIKE}
        AND ${dateCond}
      ORDER BY posting_date, voucher_no
    `)
  }
}

// So tên KH không phân biệt hoa thường/khoảng trắng thừa (dữ liệu nhập khẩu).
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Kỳ báo cáo → Date (cột kiểu DATE, bỏ giờ).
function parseRange(filter: SalesReportFilterDto): { from: Date; to: Date } {
  const from = new Date(filter.fromDate)
  const to = new Date(filter.toDate)
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException('Từ ngày phải nhỏ hơn hoặc bằng đến ngày')
  }
  return { from, to }
}
