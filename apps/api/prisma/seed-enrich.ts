// Làm giàu dữ liệu seed sau khi import xong các file MISA (mức tổng hợp).
// File MISA chỉ có header chứng từ (1 dòng đại diện, VAT=0, không itemId/qty).
// Bước này sinh dòng hàng chi tiết "giả lập hợp lý" + liên kết chứng từ + số dư
// đầu kỳ chi tiết, GIỮ NGUYÊN tổng tiền (totalAmount) từng chứng từ nên mọi bút
// toán vẫn cân và khớp phiếu thu/chi gốc.
//
// RNG cố định (mulberry32) → chạy lại cho kết quả lặp lại được.
// Gọi từ seed.ts sau vòng import.
import { PartnerType, Prisma } from '@prisma/client'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import type { PrismaService } from '../src/database/prisma.service'

// ── RNG cố định ──────────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHUNK = 500

async function createManyChunked<T>(
  rows: T[],
  create: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await create(rows.slice(i, i + CHUNK))
  }
}

// Đơn giá cơ sở ổn định theo mã sản phẩm (bê tông ~900k–1,4tr/m³).
function basePrice(code: string, rng: () => number): number {
  // Neo theo mác bê tông trong tên/mã nếu có, cộng nhiễu nhỏ theo RNG.
  const m = code.match(/M\s?(\d{2,3})/i)
  const grade = m ? Number(m[1]) : 0
  const anchor = grade >= 100 ? 850_000 + (grade - 100) * 2200 : 950_000
  const noise = Math.round((rng() - 0.5) * 80_000)
  return Math.max(600_000, anchor + noise)
}

// Số lượng đẹp theo bước 0.5 m³.
function niceQty(target: number, price: number, rng: () => number): number {
  const raw = target / price
  const half = Math.max(1, Math.round(raw * 2)) / 2
  // thêm dao động nhẹ nhưng vẫn > 0
  return Math.max(0.5, half + (rng() < 0.3 ? 0.5 : 0))
}

interface EnrichStats {
  salesLines: number
  purchaseItems: number
  receiptsLinked: number
  issuesLinked: number
  salesPaid: number
  bankOpening: number
}

export async function enrichSeed(prisma: PrismaService): Promise<EnrichStats> {
  const rng = mulberry32(20260720)
  const stats: EnrichStats = {
    salesLines: 0,
    purchaseItems: 0,
    receiptsLinked: 0,
    issuesLinked: 0,
    salesPaid: 0,
    bankOpening: 0,
  }

  // ── Danh mục sản phẩm dùng để sinh dòng hàng ────────────────────────────────
  const finished = await prisma.product.findMany({
    where: { type: 'FINISHED' },
    select: { id: true, code: true, name: true, unit: true, revenueAccount: true },
  })
  const materials = await prisma.product.findMany({
    where: { type: 'MATERIAL' },
    select: { id: true, code: true, name: true, unit: true },
  })

  // ── 1. Giá vốn NVL từ tồn kho đầu kỳ (giá trị tồn / SL tồn) ─────────────────
  const invBalances = await prisma.inventoryOpeningBalance.findMany({
    select: { productId: true, quantity: true, amount: true },
  })
  const costByProduct = new Map<string, number>()
  for (const b of invBalances) {
    const qty = Number(b.quantity)
    const amt = Number(b.amount)
    if (qty > 0 && amt > 0) costByProduct.set(b.productId, amt / qty)
  }
  await createManyChunked(
    [...costByProduct.entries()].filter(([id]) => materials.some((m) => m.id === id)),
    async (batch) => {
      await prisma.$transaction(
        batch.map(([id, price]) =>
          prisma.product.update({
            where: { id },
            data: { purchasePrice: new Prisma.Decimal(Math.round(price)) },
          }),
        ),
      )
    },
  )

  // ── 2. Dòng hàng bán hàng (bê tông) — giữ tổng, tách VAT 10% ─────────────────
  if (finished.length > 0) {
    const salesVouchers = await prisma.salesVoucher.findMany({
      select: { id: true, invoiceNo: true, totalAmount: true },
    })
    // Lấy định khoản gốc từ dòng synthetic hiện có (đã set đúng theo payment mode).
    const oldLines = await prisma.salesVoucherLine.findMany({
      select: { voucherId: true, debtAccount: true, revenueAccount: true, vatAccount: true },
    })
    const acctByVoucher = new Map(
      oldLines.map((l) => [
        l.voucherId,
        { debt: l.debtAccount, revenue: l.revenueAccount, vat: l.vatAccount },
      ]),
    )

    const priceCache = new Map<string, number>()
    const priceOf = (code: string) => {
      let p = priceCache.get(code)
      if (p === undefined) {
        p = basePrice(code, rng)
        priceCache.set(code, p)
      }
      return p
    }

    const newLines: Prisma.SalesVoucherLineCreateManyInput[] = []
    // Map invoiceNo → dòng hàng (dùng cho xuất kho mirror ở bước 5).
    const linesByInvoice = new Map<
      string,
      Array<{ itemId: string; itemName: string; unit: string | null; qty: number; unitPrice: number }>
    >()
    // Trung bình đơn giá theo sản phẩm → cập nhật salePrice.
    const priceSamples = new Map<string, { sum: number; n: number }>()

    for (const v of salesVouchers) {
      const gross = Number(v.totalAmount)
      if (gross <= 0) continue
      const net = Math.round(gross / 1.1)
      const vatTotal = gross - net
      const acct = acctByVoucher.get(v.id) ?? {
        debt: CHART_OF_ACCOUNTS.RECEIVABLE,
        revenue: CHART_OF_ACCOUNTS.REVENUE_GOODS,
        vat: CHART_OF_ACCOUNTS.VAT_OUTPUT_DETAIL,
      }
      const L = 1 + Math.floor(rng() * 3) // 1..3 dòng
      // chia net thành L phần (phần cuối = phần dư)
      const shares: number[] = []
      let remaining = net
      for (let i = 0; i < L; i++) {
        if (i === L - 1) shares.push(remaining)
        else {
          const w = 0.25 + rng() * 0.5
          const s = Math.min(remaining - (L - 1 - i), Math.max(1, Math.round(net * w * (1 / L) * 2)))
          shares.push(s)
          remaining -= s
        }
      }
      const invLines: Array<{
        itemId: string
        itemName: string
        unit: string | null
        qty: number
        unitPrice: number
      }> = []
      let vatRemaining = vatTotal
      for (let i = 0; i < L; i++) {
        const share = shares[i]!
        const prod = finished[Math.floor(rng() * finished.length)]!
        const price = priceOf(prod.code)
        const qty = niceQty(share, price, rng)
        const unitPrice = Math.round(share / qty)
        const vatAmount = i === L - 1 ? vatRemaining : Math.round((share / net) * vatTotal)
        vatRemaining -= vatAmount
        newLines.push({
          voucherId: v.id,
          lineNo: i + 1,
          itemId: prod.id,
          itemName: prod.name,
          debtAccount: acct.debt,
          revenueAccount: prod.revenueAccount ?? acct.revenue,
          unit: prod.unit,
          quantity: new Prisma.Decimal(qty),
          unitPrice: new Prisma.Decimal(unitPrice),
          amount: new Prisma.Decimal(share),
          vatRate: new Prisma.Decimal(10),
          vatAmount: new Prisma.Decimal(vatAmount),
          vatAccount: acct.vat,
        })
        invLines.push({ itemId: prod.id, itemName: prod.name, unit: prod.unit, qty, unitPrice })
        const ps = priceSamples.get(prod.id) ?? { sum: 0, n: 0 }
        ps.sum += unitPrice
        ps.n += 1
        priceSamples.set(prod.id, ps)
        stats.salesLines++
      }
      if (v.invoiceNo) linesByInvoice.set(v.invoiceNo, invLines)
    }

    // Thay dòng synthetic bằng dòng chi tiết.
    await prisma.salesVoucherLine.deleteMany({})
    await createManyChunked(newLines, (batch) =>
      prisma.salesVoucherLine.createMany({ data: batch }),
    )
    // Header: totalGoods = net, totalVat = gross − net (totalAmount giữ nguyên).
    await prisma.$executeRaw`
      UPDATE sales_vouchers
      SET total_goods = ROUND(total_amount / 1.1, 0),
          total_vat = total_amount - ROUND(total_amount / 1.1, 0)
      WHERE total_amount > 0`

    // salePrice cho thành phẩm = trung bình đơn giá đã sinh.
    await createManyChunked(
      [...priceSamples.entries()],
      async (batch) => {
        await prisma.$transaction(
          batch.map(([id, ps]) =>
            prisma.product.update({
              where: { id },
              data: {
                salePrice: new Prisma.Decimal(Math.round(ps.sum / ps.n)),
                purchasePrice: new Prisma.Decimal(Math.round((ps.sum / ps.n) * 0.8)),
              },
            }),
          ),
        )
      },
    )

    // ── 5. Xuất kho ↔ bán hàng: mirror dòng với giá vốn ~78–85% ───────────────
    const issues = await prisma.goodsIssueVoucher.findMany({
      select: { id: true, description: true, customerName: true },
    })
    const issueLines: Prisma.GoodsIssueLineCreateManyInput[] = []
    const issueTotals = new Map<string, number>()
    const deleteIssueIds: string[] = []
    for (const g of issues) {
      const m = g.description?.match(/hóa đơn số\s*(\d+)/i)
      const inv = m ? m[1]! : null
      const src = inv ? linesByInvoice.get(inv) : null
      if (!src) continue
      deleteIssueIds.push(g.id)
      const ratio = 0.78 + rng() * 0.07
      let total = 0
      src.forEach((sl, i) => {
        const cost = Math.round(sl.unitPrice * ratio)
        const amount = Math.round(cost * sl.qty)
        total += amount
        issueLines.push({
          voucherId: g.id,
          lineNo: i + 1,
          itemId: sl.itemId,
          itemName: sl.itemName,
          debitAccount: CHART_OF_ACCOUNTS.COGS, // 632
          creditAccount: CHART_OF_ACCOUNTS.FINISHED_GOODS, // 155
          unit: sl.unit,
          quantity: new Prisma.Decimal(sl.qty),
          unitPrice: new Prisma.Decimal(cost),
          amount: new Prisma.Decimal(amount),
        })
      })
      issueTotals.set(g.id, total)
      stats.issuesLinked++
    }
    if (deleteIssueIds.length > 0) {
      await createManyChunked(deleteIssueIds, (batch) =>
        prisma.goodsIssueLine.deleteMany({ where: { voucherId: { in: batch } } }),
      )
      await createManyChunked(issueLines, (batch) =>
        prisma.goodsIssueLine.createMany({ data: batch }),
      )
      await createManyChunked([...issueTotals.entries()], async (batch) => {
        await prisma.$transaction(
          batch.map(([id, total]) =>
            prisma.goodsIssueVoucher.update({
              where: { id },
              data: { totalAmount: new Prisma.Decimal(total) },
            }),
          ),
        )
      })
    }

    // ── 6. Phiếu thu ↔ bán hàng thu tiền ngay (voucherNo trùng PTxxxx/2026) ────
    const cashSales = await prisma.cashVoucher.findMany({
      where: { category: 'SALES_CASH' },
      select: { id: true, voucherNo: true },
    })
    const cashByNo = new Map(cashSales.map((c) => [c.voucherNo, c.id]))
    const salesByNo = await prisma.salesVoucher.findMany({
      select: { id: true, voucherNo: true },
    })
    const linkPairs = salesByNo
      .map((s) => ({ salesId: s.id, cashId: cashByNo.get(s.voucherNo) }))
      .filter((p): p is { salesId: string; cashId: string } => !!p.cashId)
    await createManyChunked(linkPairs, async (batch) => {
      await prisma.$transaction(
        batch.map((p) =>
          prisma.salesVoucher.update({
            where: { id: p.salesId },
            data: { receiptId: p.cashId, paymentMode: 'PAID_NOW' },
          }),
        ),
      )
    })
    stats.salesPaid = linkPairs.length
  }

  // ── 3. Dòng mua hàng: gắn item NVL + kho (giữ net/vat gốc) ───────────────────
  if (materials.length > 0) {
    const purchases = await prisma.purchaseVoucher.findMany({
      where: { type: 'STOCK' },
      select: { id: true },
    })
    const pLines = await prisma.purchaseVoucherLine.findMany({
      where: { voucher: { type: 'STOCK' } },
      select: { id: true, voucherId: true, amount: true },
    })
    await createManyChunked(pLines, async (batch) => {
      await prisma.$transaction(
        batch.map((l) => {
          const prod = materials[Math.floor(rng() * materials.length)]!
          const price = costByProduct.get(prod.id) ?? 0
          const qty = price > 0 ? Number(l.amount) / price : 1
          return prisma.purchaseVoucherLine.update({
            where: { id: l.id },
            data: {
              itemId: prod.id,
              itemName: prod.name,
              warehouseId: 'KHO NGUYENLIEU',
              stockAccount: CHART_OF_ACCOUNTS.MATERIAL, // 152
              unit: prod.unit,
              quantity: new Prisma.Decimal(qty.toFixed(4)),
            },
          })
        }),
      )
    })
    stats.purchaseItems = pLines.length
    void purchases

    // ── 4. Nhập kho ↔ mua hàng: gắn reference + item + kho ─────────────────────
    const receipts = await prisma.inventoryReceipt.findMany({
      where: { receiptType: 'PURCHASE' },
      select: { id: true, voucherNo: true },
    })
    const purchaseNos = new Set(
      (await prisma.purchaseVoucher.findMany({ select: { voucherNo: true } })).map(
        (p) => p.voucherNo,
      ),
    )
    const matched = receipts.filter((r) => purchaseNos.has(r.voucherNo))
    await createManyChunked(matched, async (batch) => {
      await prisma.$transaction(
        batch.map((r) =>
          prisma.inventoryReceipt.update({
            where: { id: r.id },
            data: { reference: r.voucherNo },
          }),
        ),
      )
    })
    // Dòng nhập kho: gắn kho + item NVL (định khoản 152/331 đã có từ import).
    const rLines = await prisma.inventoryReceiptLine.findMany({
      where: { receipt: { receiptType: 'PURCHASE' } },
      select: { id: true },
    })
    await createManyChunked(rLines, async (batch) => {
      await prisma.$transaction(
        batch.map((l) => {
          const prod = materials[Math.floor(rng() * materials.length)]!
          return prisma.inventoryReceiptLine.update({
            where: { id: l.id },
            data: { itemId: prod.id, itemName: prod.name, warehouseId: 'KHO NGUYENLIEU', unit: prod.unit },
          })
        }),
      )
    })
    stats.receiptsLinked = matched.length
  }

  // ── 7. Số dư tiền gửi đầu kỳ: dồn dư 1121 vào TK ngân hàng chính ─────────────
  const acct1121 = await prisma.accountOpeningBalance.findUnique({
    where: { accountCode: '1121' },
    select: { debitAmount: true },
  })
  const mainBank = await prisma.bankAccount.findUnique({
    where: { accountNumber: '119620376666' },
    select: { id: true },
  })
  if (acct1121 && mainBank && Number(acct1121.debitAmount) > 0) {
    await prisma.bankAccountOpeningBalance.upsert({
      where: { accountCode_bankAccountId: { accountCode: '1121', bankAccountId: mainBank.id } },
      update: { debitAmount: acct1121.debitAmount },
      create: {
        accountCode: '1121',
        bankAccountId: mainBank.id,
        debitAmount: acct1121.debitAmount,
      },
    })
    stats.bankOpening = 1
  }

  // ── 8. Nhân viên kinh doanh cho bán hàng + xuất kho (round-robin) ────────────
  const salesEmployees = await prisma.employee.findMany({
    where: { department: { contains: 'kinh doanh', mode: 'insensitive' } },
    select: { id: true },
  })
  if (salesEmployees.length > 0) {
    const empIds = salesEmployees.map((e) => e.id)
    // Bán hàng
    const sIds = (await prisma.salesVoucher.findMany({ select: { id: true } })).map((s) => s.id)
    let k = 0
    await createManyChunked(sIds, async (batch) => {
      await prisma.$transaction(
        batch.map((id) =>
          prisma.salesVoucher.update({
            where: { id },
            data: { salesEmployeeId: empIds[k++ % empIds.length] },
          }),
        ),
      )
    })
    // Xuất kho
    const gIds = (await prisma.goodsIssueVoucher.findMany({ select: { id: true } })).map((g) => g.id)
    let j = 0
    await createManyChunked(gIds, async (batch) => {
      await prisma.$transaction(
        batch.map((id) =>
          prisma.goodsIssueVoucher.update({
            where: { id },
            data: { salesEmployeeId: empIds[j++ % empIds.length] },
          }),
        ),
      )
    })
  }

  // ── 9. Chứng từ mua hàng nguồn cho PC mua hàng/mua dịch vụ tiền mặt ──────────
  await backfillPurchaseCashSources(prisma)

  return stats
}

// PC PURCHASE_GOODS_CASH / PURCHASE_SERVICE_CASH nhập từ Excel không kèm chứng
// từ mua hàng gốc → sinh MH/MDV trả ngay tiền mặt tương ứng và link paymentId
// để nút "Xem" mở thẳng chứng từ mua hàng/mua dịch vụ. Line giữ nguyên định
// khoản PC (Nợ TK chi phí-hàng / Có 1111, VAT = 0) nên journal khử trùng qua
// payment_id không làm sổ sách đổi số. Idempotent: bỏ qua PC đã có nguồn.
export async function backfillPurchaseCashSources(prisma: PrismaService): Promise<number> {
  const pcs = await prisma.cashVoucher.findMany({
    where: { category: { in: ['PURCHASE_GOODS_CASH', 'PURCHASE_SERVICE_CASH'] } },
    include: { lines: { orderBy: { lineNo: 'asc' } } },
    orderBy: { postingDate: 'asc' },
  })
  const linked = new Set(
    (
      await prisma.purchaseVoucher.findMany({
        where: { paymentId: { not: null } },
        select: { paymentId: true },
      })
    ).map((p) => p.paymentId!),
  )
  const missing = pcs.filter((pc) => !linked.has(pc.id))
  if (missing.length === 0) return 0

  // Số chứng từ tiếp theo mỗi prefix: MAX(seq hiện có) + 1 (giữ hậu tố năm phổ biến).
  const nextNo = async (prefix: 'MH' | 'MDV') => {
    const rows = await prisma.purchaseVoucher.findMany({
      where: { voucherNo: { startsWith: prefix } },
      select: { voucherNo: true },
    })
    let max = 0
    let suffix = '/2025'
    for (const r of rows) {
      const m = r.voucherNo.match(new RegExp(`^${prefix}(\\d+)(/\\d{4})?$`))
      if (m && Number(m[1]) > max) {
        max = Number(m[1])
        if (m[2]) suffix = m[2]
      }
    }
    let seq = max
    return () => `${prefix}${++seq}${suffix}`
  }
  const nextMH = await nextNo('MH')
  const nextMDV = await nextNo('MDV')

  for (const pc of missing) {
    const service = pc.category === 'PURCHASE_SERVICE_CASH'
    await prisma.purchaseVoucher.create({
      data: {
        type: service ? 'SERVICE' : 'NON_STOCK',
        origin: 'DOMESTIC',
        paymentMode: 'IMMEDIATE',
        receiveWithInvoice: true,
        voucherNo: service ? nextMDV() : nextMH(),
        postingDate: pc.postingDate,
        voucherDate: pc.voucherDate,
        supplierId: pc.partnerId,
        supplierName: pc.partnerName,
        description: pc.reason,
        totalGoods: pc.totalAmount,
        totalVat: new Prisma.Decimal(0),
        totalPayment: pc.totalAmount,
        receiveStatus: 'RECEIVED',
        paymentStatus: 'PAID',
        posted: pc.posted,
        branchId: pc.branchId,
        paymentId: pc.id,
        lines: {
          create: pc.lines.map((l, i) => ({
            lineNo: i + 1,
            itemName: l.description ?? pc.reason,
            stockAccount: l.debitAccount,
            payableAccount: l.creditAccount,
            quantity: new Prisma.Decimal(1),
            unitPrice: l.amount,
            amount: l.amount,
            vatRate: new Prisma.Decimal(0),
            vatAmount: new Prisma.Decimal(0),
            vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT,
          })),
        },
      },
    })
  }
  return missing.length
}
