import type {
  ItemLedgerReportDto,
  ItemLedgerRowDto,
  StockSummaryReportDto,
  StockSummaryRowDto,
} from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { ItemLedgerFilterDto, StockSummaryFilterDto } from './dto/inventory-report-filter.dto'

const ZERO = new Prisma.Decimal(0)

// Dòng nhập/xuất chạm 1 VTHH trả về từ SQL (ngày ép ::text → 'yyyy-mm-dd').
interface RawLedgerLine {
  voucher_id: string
  kind: 'RECEIPT' | 'ISSUE'
  posting_date: string
  voucher_date: string
  voucher_no: string
  description: string | null
  counter_account: string
  unit_price: string
  qty: string
  amount: string
}

// Báo cáo phân hệ Kho: tổng hợp tồn kho + sổ chi tiết vật tư hàng hóa.
// Phát sinh lấy từ inventory_receipt_lines (nhập) và goods_issue_lines (xuất);
// purchase/sales không tự sinh chứng từ kho. Chứng từ nhập khẩu Excel chỉ ở mức
// tổng hợp (dòng đại diện không có mã hàng) → loại khỏi báo cáo (COALESCE(item_id,'') <> '').
// Tồn đầu kỳ = khai báo inventory_opening_balances + phát sinh trước kỳ.
// Giá trị dùng amount lưu trên dòng (không tính lại giá xuất kho).
@Injectable()
export class InventoryReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tổng hợp tồn kho (mỗi VTHH 1 dòng) ─────────────────────────────────────
  async stockSummary(filter: StockSummaryFilterDto): Promise<StockSummaryReportDto> {
    const { from, to } = parseRange(filter)
    const wh = filter.warehouseCode
    const [declared, preMovement, movement] = await Promise.all([
      this.declaredByItem(wh),
      this.netMovementByItem(Prisma.sql`v.posting_date < ${from}`, wh),
      this.inOutByItem(from, to, wh),
    ])

    // Gom mọi VTHH xuất hiện ở tồn khai báo / phát sinh trước kỳ / trong kỳ.
    const openings = new Map<string, { qty: Prisma.Decimal; amount: Prisma.Decimal }>()
    const meta = new Map<string, { name: string | null; unit: string | null }>()
    for (const r of declared) {
      openings.set(r.key, { qty: new Prisma.Decimal(r.qty), amount: new Prisma.Decimal(r.amount) })
      meta.set(r.key, { name: r.name, unit: r.unit })
    }
    for (const r of preMovement) {
      const cur = openings.get(r.key) ?? { qty: ZERO, amount: ZERO }
      openings.set(r.key, { qty: cur.qty.add(r.qty), amount: cur.amount.add(r.amount) })
    }

    const codes = [...new Set([...openings.keys(), ...movement.keys()])].sort()
    await this.fillProductMeta(codes, meta)

    let totalOpening = ZERO
    let totalIn = ZERO
    let totalOut = ZERO
    let totalClosing = ZERO
    const keyword = filter.keyword?.trim().toLowerCase()
    const rows: StockSummaryRowDto[] = []
    for (const code of codes) {
      const opening = openings.get(code) ?? { qty: ZERO, amount: ZERO }
      const move = movement.get(code)
      const inQty = move?.inQty ?? ZERO
      const inAmount = move?.inAmount ?? ZERO
      const outQty = move?.outQty ?? ZERO
      const outAmount = move?.outAmount ?? ZERO
      const closingQty = opening.qty.add(inQty).sub(outQty)
      const closingAmount = opening.amount.add(inAmount).sub(outAmount)

      // Bỏ VTHH không có số dư lẫn phát sinh (thường là tồn khai báo đã xuất hết từ kỳ trước).
      const allZero =
        opening.qty.isZero() && opening.amount.isZero() && inQty.isZero() && inAmount.isZero() &&
        outQty.isZero() && outAmount.isZero() && closingQty.isZero() && closingAmount.isZero()
      if (allZero) continue

      const m = meta.get(code) ?? { name: null, unit: null }
      if (keyword) {
        const hit =
          code.toLowerCase().includes(keyword) || (m.name ?? '').toLowerCase().includes(keyword)
        if (!hit) continue
      }

      totalOpening = totalOpening.add(opening.amount)
      totalIn = totalIn.add(inAmount)
      totalOut = totalOut.add(outAmount)
      totalClosing = totalClosing.add(closingAmount)
      rows.push({
        itemCode: code,
        itemName: m.name,
        unit: m.unit,
        openingQty: opening.qty.toString(),
        openingAmount: opening.amount.toString(),
        inQty: inQty.toString(),
        inAmount: inAmount.toString(),
        outQty: outQty.toString(),
        outAmount: outAmount.toString(),
        closingQty: closingQty.toString(),
        closingAmount: closingAmount.toString(),
      })
    }

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      rows,
      totalOpeningAmount: totalOpening.toString(),
      totalInAmount: totalIn.toString(),
      totalOutAmount: totalOut.toString(),
      totalClosingAmount: totalClosing.toString(),
    }
  }

  // ── Sổ chi tiết vật tư hàng hóa (1 VTHH) ───────────────────────────────────
  async itemLedger(filter: ItemLedgerFilterDto): Promise<ItemLedgerReportDto> {
    const { from, to } = parseRange(filter)
    const item = filter.itemCode.trim()
    const wh = filter.warehouseCode
    const [declared, preMovement, lines, product] = await Promise.all([
      this.declaredForItem(item, wh),
      this.netMovementByItem(Prisma.sql`v.posting_date < ${from}`, wh, item),
      this.ledgerLines(item, from, to, wh),
      this.prisma.product.findUnique({
        where: { code: item },
        select: { name: true, unit: true },
      }),
    ])

    let balanceQty = declared.qty
    let balanceAmount = declared.amount
    for (const r of preMovement) {
      balanceQty = balanceQty.add(r.qty)
      balanceAmount = balanceAmount.add(r.amount)
    }
    const openingQty = balanceQty
    const openingAmount = balanceAmount

    let totalInQty = ZERO
    let totalInAmount = ZERO
    let totalOutQty = ZERO
    let totalOutAmount = ZERO
    const rows: ItemLedgerRowDto[] = lines.map((l) => {
      const isReceipt = l.kind === 'RECEIPT'
      if (isReceipt) {
        totalInQty = totalInQty.add(l.qty)
        totalInAmount = totalInAmount.add(l.amount)
        balanceQty = balanceQty.add(l.qty)
        balanceAmount = balanceAmount.add(l.amount)
      } else {
        totalOutQty = totalOutQty.add(l.qty)
        totalOutAmount = totalOutAmount.add(l.amount)
        balanceQty = balanceQty.sub(l.qty)
        balanceAmount = balanceAmount.sub(l.amount)
      }
      return {
        voucherId: l.voucher_id,
        voucherKind: l.kind,
        postingDate: l.posting_date,
        voucherDate: l.voucher_date,
        voucherNo: l.voucher_no,
        description: l.description,
        counterAccount: l.counter_account,
        unitPrice: l.unit_price,
        inQty: isReceipt ? l.qty : '0',
        inAmount: isReceipt ? l.amount : '0',
        outQty: isReceipt ? '0' : l.qty,
        outAmount: isReceipt ? '0' : l.amount,
        balanceQty: balanceQty.toString(),
        balanceAmount: balanceAmount.toString(),
      }
    })

    return {
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      itemCode: item,
      itemName: product?.name ?? null,
      unit: product?.unit ?? null,
      openingQty: openingQty.toString(),
      openingAmount: openingAmount.toString(),
      totalInQty: totalInQty.toString(),
      totalInAmount: totalInAmount.toString(),
      totalOutQty: totalOutQty.toString(),
      totalOutAmount: totalOutAmount.toString(),
      closingQty: balanceQty.toString(),
      closingAmount: balanceAmount.toString(),
      rows,
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Tồn đầu kỳ khai báo theo VTHH (inventory_opening_balances join products lấy mã).
  private async declaredByItem(warehouseCode?: string) {
    const rows = await this.prisma.$queryRaw<
      { item_code: string; item_name: string; unit: string | null; qty: string; amount: string }[]
    >(Prisma.sql`
      SELECT p.code AS item_code, p.name AS item_name, p.unit,
             SUM(b.quantity)::text AS qty, SUM(b.amount)::text AS amount
      FROM inventory_opening_balances b
      JOIN products p ON p.id = b.product_id
      ${warehouseCode ? Prisma.sql`WHERE b.warehouse_code = ${warehouseCode}` : Prisma.empty}
      GROUP BY p.code, p.name, p.unit
    `)
    return rows.map((r) => ({
      key: r.item_code,
      name: r.item_name,
      unit: r.unit,
      qty: r.qty,
      amount: r.amount,
    }))
  }

  // Tồn đầu kỳ khai báo của riêng 1 VTHH.
  private async declaredForItem(itemCode: string, warehouseCode?: string) {
    const rows = await this.prisma.$queryRaw<{ qty: string; amount: string }[]>(Prisma.sql`
      SELECT COALESCE(SUM(b.quantity), 0)::text AS qty, COALESCE(SUM(b.amount), 0)::text AS amount
      FROM inventory_opening_balances b
      JOIN products p ON p.id = b.product_id
      WHERE p.code = ${itemCode}
      ${warehouseCode ? Prisma.sql`AND b.warehouse_code = ${warehouseCode}` : Prisma.empty}
    `)
    return {
      qty: new Prisma.Decimal(rows[0]?.qty ?? 0),
      amount: new Prisma.Decimal(rows[0]?.amount ?? 0),
    }
  }

  // Net phát sinh (nhập − xuất) theo VTHH với điều kiện thời gian tùy chọn.
  private async netMovementByItem(
    dateCond: Prisma.Sql,
    warehouseCode?: string,
    itemCode?: string,
  ): Promise<{ key: string; qty: string; amount: string }[]> {
    const cond = this.lineCond(warehouseCode, itemCode)
    const rows = await this.prisma.$queryRaw<
      { item_code: string; qty: string; amount: string }[]
    >(Prisma.sql`
      SELECT t.item_code, SUM(t.qty)::text AS qty, SUM(t.amount)::text AS amount
      FROM (
        SELECT l.item_id AS item_code, l.quantity AS qty, l.amount AS amount
        FROM inventory_receipt_lines l
        JOIN inventory_receipts v ON v.id = l.receipt_id
        WHERE ${dateCond} ${cond}
        UNION ALL
        SELECT l.item_id, -l.quantity, -l.amount
        FROM goods_issue_lines l
        JOIN goods_issue_vouchers v ON v.id = l.voucher_id
        WHERE ${dateCond} ${cond}
      ) t
      GROUP BY t.item_code
    `)
    return rows.map((r) => ({ key: r.item_code, qty: r.qty, amount: r.amount }))
  }

  // Phát sinh nhập/xuất tách cột theo VTHH trong kỳ.
  private async inOutByItem(from: Date, to: Date, warehouseCode?: string) {
    const cond = this.lineCond(warehouseCode)
    const rows = await this.prisma.$queryRaw<
      { item_code: string; in_qty: string; in_amount: string; out_qty: string; out_amount: string }[]
    >(Prisma.sql`
      SELECT t.item_code,
             SUM(t.in_qty)::text AS in_qty, SUM(t.in_amount)::text AS in_amount,
             SUM(t.out_qty)::text AS out_qty, SUM(t.out_amount)::text AS out_amount
      FROM (
        SELECT l.item_id AS item_code, l.quantity AS in_qty, l.amount AS in_amount,
               0 AS out_qty, 0 AS out_amount
        FROM inventory_receipt_lines l
        JOIN inventory_receipts v ON v.id = l.receipt_id
        WHERE v.posting_date BETWEEN ${from} AND ${to} ${cond}
        UNION ALL
        SELECT l.item_id, 0, 0, l.quantity, l.amount
        FROM goods_issue_lines l
        JOIN goods_issue_vouchers v ON v.id = l.voucher_id
        WHERE v.posting_date BETWEEN ${from} AND ${to} ${cond}
      ) t
      GROUP BY t.item_code
    `)
    return new Map(
      rows.map((r) => [
        r.item_code,
        {
          inQty: new Prisma.Decimal(r.in_qty),
          inAmount: new Prisma.Decimal(r.in_amount),
          outQty: new Prisma.Decimal(r.out_qty),
          outAmount: new Prisma.Decimal(r.out_amount),
        },
      ]),
    )
  }

  // Dòng chi tiết nhập/xuất của 1 VTHH trong kỳ, thứ tự ghi sổ.
  // Diễn giải lấy theo header (dòng hàng không có cột diễn giải riêng);
  // TK đối ứng: nhập → TK Có, xuất → TK Nợ (đối ứng của TK kho).
  private async ledgerLines(
    itemCode: string,
    from: Date,
    to: Date,
    warehouseCode?: string,
  ): Promise<RawLedgerLine[]> {
    const cond = this.lineCond(warehouseCode, itemCode)
    return this.prisma.$queryRaw<RawLedgerLine[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             'RECEIPT' AS kind,
             v.posting_date::text AS posting_date,
             v.voucher_date::text AS voucher_date,
             v.voucher_no,
             v.description,
             COALESCE(l.credit_account, '') AS counter_account,
             l.unit_price::text AS unit_price,
             l.quantity::text AS qty,
             l.amount::text AS amount,
             l.line_no
      FROM inventory_receipt_lines l
      JOIN inventory_receipts v ON v.id = l.receipt_id
      WHERE v.posting_date BETWEEN ${from} AND ${to} ${cond}
      UNION ALL
      SELECT v.id,
             'ISSUE',
             v.posting_date::text,
             v.voucher_date::text,
             v.voucher_no,
             v.description,
             COALESCE(l.debit_account, ''),
             l.unit_price::text,
             l.quantity::text,
             l.amount::text,
             l.line_no
      FROM goods_issue_lines l
      JOIN goods_issue_vouchers v ON v.id = l.voucher_id
      WHERE v.posting_date BETWEEN ${from} AND ${to} ${cond}
      ORDER BY posting_date, voucher_no, line_no
    `)
  }

  // Điều kiện chung trên dòng hàng: bỏ dòng đại diện nhập khẩu (không có mã hàng),
  // lọc theo kho / theo VTHH khi có.
  private lineCond(warehouseCode?: string, itemCode?: string): Prisma.Sql {
    const parts = [Prisma.sql`AND COALESCE(l.item_id, '') <> ''`]
    if (itemCode) parts.push(Prisma.sql`AND l.item_id = ${itemCode}`)
    if (warehouseCode) parts.push(Prisma.sql`AND COALESCE(l.warehouse_id, '') = ${warehouseCode}`)
    return Prisma.join(parts, ' ')
  }

  // Bổ sung tên/ĐVT từ danh mục cho các mã chưa có meta (chỉ xuất hiện ở phát sinh).
  private async fillProductMeta(
    codes: string[],
    meta: Map<string, { name: string | null; unit: string | null }>,
  ) {
    const missing = codes.filter((c) => !meta.has(c))
    if (missing.length === 0) return
    const products = await this.prisma.product.findMany({
      where: { code: { in: missing } },
      select: { code: true, name: true, unit: true },
    })
    for (const p of products) meta.set(p.code, { name: p.name, unit: p.unit })
  }
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
