import type {
  PurchaseByItemReportDto,
  PurchaseDetailReportDto,
  SupplierPayableDetailGroupDto,
  SupplierPayableDetailReportDto,
  SupplierPayableSummaryReportDto,
  SupplierPayableSummaryRowDto,
} from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { PurchaseReportFilterDto } from './dto/purchase-report-filter.dto'
import { PayableService, buildSupplierResolver } from './payable.service'
import type { RawPayableRow, SupplierKey } from './payable.service'

const ZERO = new Prisma.Decimal(0)

// Dòng hàng chứng từ mua trả về từ SQL (ngày ép ::text → 'yyyy-mm-dd').
interface RawDetailRow {
  voucher_id: string
  posting_date: string
  voucher_date: string
  voucher_no: string
  invoice_no: string | null
  supplier_name: string | null
  description: string | null
  item_name: string | null
  unit: string | null
  quantity: string
  unit_price: string
  amount: string
  vat_amount: string
}

// Nhóm số liệu công nợ tích lũy theo NCC.
interface PayableBucket extends Omit<SupplierKey, 'key'> {
  opening: Prisma.Decimal
  credit: Prisma.Decimal
  debit: Prisma.Decimal
  rows: RawPayableRow[]
}

// Báo cáo phân hệ Mua hàng: sổ chi tiết mua hàng, tổng hợp theo mặt hàng,
// tổng hợp + chi tiết công nợ phải trả NCC (TK 331).
// Quy ước công nợ (chốt với nghiệp vụ): chứng từ mua payment_mode=UNPAID mới ghi
// Có 331 (mua trả ngay hạch toán thẳng, không qua công nợ); phát sinh Nợ 331 lấy
// từ dòng hạch toán phiếu chi tiền mặt/tiền gửi; dư đầu kỳ = số dư khai báo
// (partner_opening_balances) + phát sinh trước kỳ.
@Injectable()
export class PurchaseReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payables: PayableService,
  ) {}

  // ── Sổ chi tiết mua hàng ───────────────────────────────────────────────────
  async detail(filter: PurchaseReportFilterDto): Promise<PurchaseDetailReportDto> {
    const { from, to } = parseRange(filter)
    const lines = await this.prisma.$queryRaw<RawDetailRow[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             v.posting_date::text AS posting_date,
             v.voucher_date::text AS voucher_date,
             v.voucher_no,
             v.invoice_no,
             v.supplier_name,
             v.description,
             l.item_name,
             l.unit,
             l.quantity::text AS quantity,
             l.unit_price::text AS unit_price,
             l.amount::text AS amount,
             l.vat_amount::text AS vat_amount
      FROM purchase_voucher_lines l
      JOIN purchase_vouchers v ON v.id = l.voucher_id
      WHERE v.posting_date BETWEEN ${from} AND ${to}
      ORDER BY v.posting_date, v.voucher_no, l.line_no
    `)

    let totalAmount = ZERO
    let totalVat = ZERO
    const rows = lines.map((l) => {
      totalAmount = totalAmount.add(l.amount)
      totalVat = totalVat.add(l.vat_amount)
      return {
        voucherId: l.voucher_id,
        postingDate: l.posting_date,
        voucherDate: l.voucher_date,
        voucherNo: l.voucher_no,
        invoiceNo: l.invoice_no,
        supplierName: l.supplier_name,
        description: l.description,
        itemName: l.item_name,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unit_price,
        amount: l.amount,
        vatAmount: l.vat_amount,
        totalPayment: new Prisma.Decimal(l.amount).add(l.vat_amount).toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalAmount: totalAmount.toString(),
      totalVat: totalVat.toString(),
      totalPayment: totalAmount.add(totalVat).toString(),
      rows,
    }
  }

  // ── Tổng hợp mua hàng theo mặt hàng ────────────────────────────────────────
  async byItem(filter: PurchaseReportFilterDto): Promise<PurchaseByItemReportDto> {
    const { from, to } = parseRange(filter)
    const groups = await this.prisma.$queryRaw<
      { item_id: string | null; item_name: string | null; unit: string | null; quantity: string; amount: string; vat_amount: string }[]
    >(Prisma.sql`
      SELECT l.item_id,
             l.item_name,
             l.unit,
             SUM(l.quantity)::text AS quantity,
             SUM(l.amount)::text AS amount,
             SUM(l.vat_amount)::text AS vat_amount
      FROM purchase_voucher_lines l
      JOIN purchase_vouchers v ON v.id = l.voucher_id
      WHERE v.posting_date BETWEEN ${from} AND ${to}
      GROUP BY l.item_id, l.item_name, l.unit
      ORDER BY l.item_name NULLS LAST
    `)

    let totalAmount = ZERO
    let totalVat = ZERO
    const rows = groups.map((g) => {
      totalAmount = totalAmount.add(g.amount)
      totalVat = totalVat.add(g.vat_amount)
      return {
        itemId: g.item_id,
        itemName: g.item_name,
        unit: g.unit,
        quantity: g.quantity,
        amount: g.amount,
        vatAmount: g.vat_amount,
        total: new Prisma.Decimal(g.amount).add(g.vat_amount).toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalAmount: totalAmount.toString(),
      totalVat: totalVat.toString(),
      totalPayment: totalAmount.add(totalVat).toString(),
      rows,
    }
  }

  // ── Tổng hợp công nợ phải trả NCC ──────────────────────────────────────────
  async payableSummary(filter: PurchaseReportFilterDto): Promise<SupplierPayableSummaryReportDto> {
    const buckets = await this.payableBuckets(filter)

    let totalOpening = ZERO
    let totalCredit = ZERO
    let totalDebit = ZERO
    let totalClosing = ZERO
    const rows: SupplierPayableSummaryRowDto[] = buckets.map((b) => {
      const closing = b.opening.add(b.credit).sub(b.debit)
      totalOpening = totalOpening.add(b.opening)
      totalCredit = totalCredit.add(b.credit)
      totalDebit = totalDebit.add(b.debit)
      totalClosing = totalClosing.add(closing)
      return {
        supplierId: b.supplierId,
        supplierCode: b.supplierCode,
        supplierName: b.supplierName,
        openingBalance: b.opening.toString(),
        creditAmount: b.credit.toString(),
        debitAmount: b.debit.toString(),
        closingBalance: closing.toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalOpening: totalOpening.toString(),
      totalCredit: totalCredit.toString(),
      totalDebit: totalDebit.toString(),
      totalClosing: totalClosing.toString(),
      rows,
    }
  }

  // ── Chi tiết công nợ phải trả NCC ──────────────────────────────────────────
  async payableDetail(filter: PurchaseReportFilterDto): Promise<SupplierPayableDetailReportDto> {
    const buckets = await this.payableBuckets(filter)

    let totalOpening = ZERO
    let totalCredit = ZERO
    let totalDebit = ZERO
    let totalClosing = ZERO
    const groups: SupplierPayableDetailGroupDto[] = buckets.map((b) => {
      // Gộp các dòng hạch toán cùng chứng từ + cùng chiều thành 1 dòng sổ.
      const merged = new Map<string, RawPayableRow & { total: Prisma.Decimal }>()
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
          const isCredit = r.kind === 'CREDIT'
          balance = isCredit ? balance.add(r.total) : balance.sub(r.total)
          return {
            voucherId: r.voucher_id,
            source: r.source,
            postingDate: r.posting_date,
            voucherNo: r.voucher_no,
            description: r.description,
            debitAmount: isCredit ? '0' : r.total.toString(),
            creditAmount: isCredit ? r.total.toString() : '0',
            balance: balance.toString(),
          }
        })

      const closing = b.opening.add(b.credit).sub(b.debit)
      totalOpening = totalOpening.add(b.opening)
      totalCredit = totalCredit.add(b.credit)
      totalDebit = totalDebit.add(b.debit)
      totalClosing = totalClosing.add(closing)
      return {
        supplierId: b.supplierId,
        supplierCode: b.supplierCode,
        supplierName: b.supplierName,
        openingBalance: b.opening.toString(),
        creditAmount: b.credit.toString(),
        debitAmount: b.debit.toString(),
        closingBalance: closing.toString(),
        rows,
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      totalOpening: totalOpening.toString(),
      totalCredit: totalCredit.toString(),
      totalDebit: totalDebit.toString(),
      totalClosing: totalClosing.toString(),
      groups,
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Gom công nợ 331 theo NCC: dư đầu (khai báo + phát sinh trước kỳ) + phát sinh
  // trong kỳ (kèm dòng chứng từ cho báo cáo chi tiết). Sắp theo tên NCC.
  private async payableBuckets(filter: PurchaseReportFilterDto): Promise<PayableBucket[]> {
    const { from, to } = parseRange(filter)
    const [suppliers, declared, before, inRange] = await Promise.all([
      this.prisma.supplier.findMany({ select: { id: true, code: true, name: true } }),
      this.payables.declaredOpenings(),
      this.payables.payableRows(Prisma.sql`v.posting_date < ${from}`),
      this.payables.payableRows(Prisma.sql`v.posting_date BETWEEN ${from} AND ${to}`),
    ])

    const resolve = buildSupplierResolver(suppliers)

    const buckets = new Map<string, PayableBucket>()
    const bucketOf = (k: SupplierKey): PayableBucket => {
      let b = buckets.get(k.key)
      if (!b) {
        b = {
          supplierId: k.supplierId,
          supplierCode: k.supplierCode,
          supplierName: k.supplierName,
          opening: ZERO,
          credit: ZERO,
          debit: ZERO,
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
      b.opening = r.kind === 'CREDIT' ? b.opening.add(r.amount) : b.opening.sub(r.amount)
    }
    for (const r of inRange) {
      const b = bucketOf(resolve(r.partner_id, r.partner_name))
      if (r.kind === 'CREDIT') b.credit = b.credit.add(r.amount)
      else b.debit = b.debit.add(r.amount)
      b.rows.push(r)
    }

    return [...buckets.values()]
      .filter((b) => filter.supplierId === undefined || b.supplierId === filter.supplierId)
      .filter((b) => !b.opening.isZero() || !b.credit.isZero() || !b.debit.isZero())
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'vi'))
  }
}

// Kỳ báo cáo → Date (cột kiểu DATE, bỏ giờ).
function parseRange(filter: PurchaseReportFilterDto): { from: Date; to: Date } {
  const from = new Date(filter.fromDate)
  const to = new Date(filter.toDate)
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException('Từ ngày phải nhỏ hơn hoặc bằng đến ngày')
  }
  return { from, to }
}
