/**
 * Sinh CHI TIẾT MẶT HÀNG (demo) cho dữ liệu chứng từ đã nhập khẩu ở mức tổng hợp.
 *
 * ⚠️  DỮ LIỆU BỊA — chỉ để demo/UI. Chi tiết mặt hàng, sản lượng, kho sinh ra ở đây
 *     KHÔNG phản ánh nghiệp vụ thật, không dùng để đối chiếu hay kê khai thuế.
 *
 * Nguyên tắc: KHÔNG đụng số tiền. Mọi tổng tiền chứng từ giữ nguyên tuyệt đối
 * (Σ thành tiền các dòng sinh ra = tổng cũ), nên báo cáo tài chính không đổi —
 * chỉ thêm chiều "mặt hàng" cho các báo cáo item-level (Mặt hàng bán chạy, tồn kho).
 *
 * Chạy:
 *   pnpm --filter @app/api exec ts-node prisma/scripts/demo-item-details.ts          # sinh (tự dọn lượt cũ trước)
 *   pnpm --filter @app/api exec ts-node prisma/scripts/demo-item-details.ts --undo   # hoàn tác về trạng thái nhập khẩu
 */
import { GoodsIssueCategory, PrismaClient, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const prisma = new PrismaClient()

// Đánh dấu chứng từ do script sinh ra (chỉ nhập kho thành phẩm là chứng từ MỚI).
const MARKER = 'DEMO_ITEM_BACKFILL'
const WH_FINISHED = 'KHO TP'
const WH_MATERIAL = 'KHO NGUYENLIEU'
const CHUNK = 500

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v)
const ZERO = D(0)

// ── RNG tất định theo khóa (chạy lại cho ra đúng kết quả cũ) ─────────────────
function hash(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rng(key: string) {
  let s = hash(key) || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}
function pick<T>(arr: T[], r: number): T {
  return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]!
}

interface Item {
  code: string
  name: string
  unit: string
  price: number // đơn giá quy ước để suy ra SẢN LƯỢNG từ số tiền có sẵn
}

// Đơn giá bê tông thương phẩm theo mác (quy ước): M100 ≈ 950k, M300 ≈ 1,25tr /m3.
function concretePrice(code: string): number {
  const mac = Number(code.replace(/^M/i, '').match(/^\d+/)?.[0] ?? 200)
  return 800_000 + (Number.isFinite(mac) ? mac : 200) * 1_500
}

// Đơn giá NVL quy ước để suy sản lượng xuất cho sản xuất.
function materialPrice(code: string): number {
  if (code.startsWith('XM_')) return 1_600 // kg
  if (code.startsWith('CAT')) return 250_000 // m3
  if (code.startsWith('DA_')) return 300_000 // m3
  if (code.startsWith('PG_')) return 15_000 // lít
  return 100_000
}

async function loadPools() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { code: true, name: true, unit: true, type: true },
    orderBy: { code: 'asc' },
  })

  // Bê tông thương phẩm — mặt hàng bán ra chính.
  const concrete: Item[] = products
    .filter((p) => p.type === 'FINISHED' && /^Bê tông thương phẩm/i.test(p.name))
    .map((p) => ({
      code: p.code,
      name: p.name,
      unit: p.unit ?? 'm3',
      price: concretePrice(p.code),
    }))
    // Giữ pool gọn (~24 mác phổ biến) để báo cáo top hàng bán chạy có ý nghĩa.
    .filter((_, i) => i % 11 === 0)
    .slice(0, 24)

  // NVL đầu vào trạm trộn: xi măng, cát, đá, phụ gia.
  const material: Item[] = products
    .filter((p) => /^(XM_|CAT|DA_|PG_)/.test(p.code))
    .map((p) => ({
      code: p.code,
      name: p.name,
      unit: p.unit ?? 'm3',
      price: materialPrice(p.code),
    }))
    .filter((_, i) => i % 3 === 0)
    .slice(0, 12)

  if (!concrete.length || !material.length)
    throw new Error('Danh mục VTHH thiếu bê tông thương phẩm hoặc NVL — dừng.')
  return { concrete, material }
}

// Chia `total` thành n phần theo tỉ trọng ngẫu nhiên; phần cuối gánh phần dư
// để Σ = total tuyệt đối (không sai lệch 1 đồng).
function split(total: Prisma.Decimal, n: number, r: () => number): Prisma.Decimal[] {
  if (n <= 1) return [total]
  const weights = Array.from({ length: n }, () => 0.5 + r())
  const sum = weights.reduce((a, b) => a + b, 0)
  const out: Prisma.Decimal[] = []
  let acc = ZERO
  for (let i = 0; i < n - 1; i++) {
    const part = total.mul(D(weights[i]! / sum)).toDecimalPlaces(0)
    out.push(part)
    acc = acc.add(part)
  }
  out.push(total.sub(acc))
  return out
}

// Số lượng suy từ số tiền + đơn giá quy ước (≥ 0.01 để không ra 0).
function qtyOf(amount: Prisma.Decimal, price: number): Prisma.Decimal {
  const q = amount.div(D(price)).toDecimalPlaces(2)
  return q.lte(0) ? D(0.01) : q
}

// ── Hoàn tác: trả dữ liệu về đúng trạng thái sau nhập khẩu xlsx ──────────────
async function undo() {
  const generated = await prisma.inventoryReceipt.findMany({
    where: { reference: MARKER },
    select: { id: true },
  })
  if (generated.length) {
    await prisma.inventoryReceipt.deleteMany({ where: { reference: MARKER } })
    console.log(`  · xóa ${generated.length} phiếu nhập kho demo`)
  }

  // Bán hàng: gộp lại 1 dòng tổng hợp như importXlsx tạo ra.
  const sales = await prisma.salesVoucher.findMany({
    select: { id: true, totalGoods: true, paymentMode: true },
  })
  await prisma.salesVoucherLine.deleteMany({})
  const salesLines = sales.map((v) => ({
    id: randomUUID(),
    voucherId: v.id,
    lineNo: 1,
    debtAccount: v.paymentMode === 'PAID_NOW' ? '1111' : '131',
    revenueAccount: '5111',
    quantity: D(1),
    unitPrice: v.totalGoods,
    amount: v.totalGoods,
    vatRate: ZERO,
    vatAmount: ZERO,
    vatAccount: '33311',
  }))
  for (let i = 0; i < salesLines.length; i += CHUNK)
    await prisma.salesVoucherLine.createMany({ data: salesLines.slice(i, i + CHUNK) })
  console.log(`  · gộp lại ${salesLines.length} dòng bán hàng`)

  // Xuất kho: bán hàng 1 dòng rỗng (SL 1, tiền 0); sản xuất 1 dòng ôm trọn tổng tiền.
  const issues = await prisma.goodsIssueVoucher.findMany({
    select: { id: true, category: true, totalAmount: true },
  })
  await prisma.goodsIssueLine.deleteMany({})
  const issueLines = issues.map((v) => {
    const sales = v.category === GoodsIssueCategory.SALES
    return {
      id: randomUUID(),
      voucherId: v.id,
      lineNo: 1,
      debitAccount: sales ? '632' : '154',
      creditAccount: sales ? '156' : '152',
      quantity: D(1),
      unitPrice: sales ? ZERO : v.totalAmount,
      amount: sales ? ZERO : v.totalAmount,
    }
  })
  for (let i = 0; i < issueLines.length; i += CHUNK)
    await prisma.goodsIssueLine.createMany({ data: issueLines.slice(i, i + CHUNK) })
  console.log(`  · gộp lại ${issueLines.length} dòng xuất kho`)

  // Mua hàng + phiếu nhập kho mua hàng: gỡ mã/tên hàng, giữ nguyên tiền.
  const p1 = await prisma.purchaseVoucherLine.updateMany({ data: { itemId: null, itemName: null } })
  const p2 = await prisma.inventoryReceiptLine.updateMany({
    data: { itemId: null, itemName: null, warehouseId: null, unit: null },
  })
  console.log(`  · gỡ mặt hàng khỏi ${p1.count} dòng mua hàng, ${p2.count} dòng nhập kho`)
}

// ── Sinh chi tiết ────────────────────────────────────────────────────────────
async function apply() {
  const { concrete, material } = await loadPools()
  console.log(`Pool: ${concrete.length} mác bê tông, ${material.length} NVL`)

  // 1) Bán hàng — tách 1..2 mặt hàng/chứng từ, Σ thành tiền = totalGoods.
  const sales = await prisma.salesVoucher.findMany({
    select: {
      id: true,
      voucherNo: true,
      invoiceNo: true,
      totalGoods: true,
      paymentMode: true,
      postingDate: true,
    },
    orderBy: { voucherNo: 'asc' },
  })

  // invoiceNo (bỏ số 0 đầu) → dòng hàng, để phiếu xuất kho bán hàng khớp đúng mặt hàng.
  const byInvoice = new Map<string, { item: Item; qty: Prisma.Decimal }[]>()
  const salesLines: Prisma.SalesVoucherLineCreateManyInput[] = []

  for (const v of sales) {
    const r = rng(v.voucherNo)
    const n = r() < 0.25 ? 2 : 1
    const parts = split(v.totalGoods, n, r)
    const chosen: { item: Item; qty: Prisma.Decimal }[] = []
    for (let i = 0; i < parts.length; i++) {
      const item = pick(concrete, r())
      const amount = parts[i]!
      const qty = qtyOf(amount, item.price)
      chosen.push({ item, qty })
      salesLines.push({
        id: randomUUID(),
        voucherId: v.id,
        lineNo: i + 1,
        itemId: item.code,
        itemName: item.name,
        unit: item.unit,
        debtAccount: v.paymentMode === 'PAID_NOW' ? '1111' : '131',
        revenueAccount: '5111',
        quantity: qty,
        // Đơn giá suy ngược từ thành tiền để Σ khớp tuyệt đối tổng chứng từ.
        unitPrice: amount.div(qty).toDecimalPlaces(2),
        amount,
        vatRate: ZERO,
        vatAmount: ZERO,
        vatAccount: '33311',
        warehouseId: WH_FINISHED,
        inventoryAccount: '155',
        costAccount: '632',
      })
    }
    if (v.invoiceNo) byInvoice.set(v.invoiceNo.replace(/^0+/, ''), chosen)
  }

  await prisma.salesVoucherLine.deleteMany({})
  for (let i = 0; i < salesLines.length; i += CHUNK)
    await prisma.salesVoucherLine.createMany({ data: salesLines.slice(i, i + CHUNK) })
  console.log(`Bán hàng: ${salesLines.length} dòng / ${sales.length} chứng từ`)

  // 2) Xuất kho — bán hàng khớp theo hóa đơn (tiền giữ 0), sản xuất tách NVL (giữ tổng tiền).
  const issues = await prisma.goodsIssueVoucher.findMany({
    select: {
      id: true,
      voucherNo: true,
      category: true,
      totalAmount: true,
      description: true,
      postingDate: true,
    },
    orderBy: { voucherNo: 'asc' },
  })

  const issueLines: Prisma.GoodsIssueLineCreateManyInput[] = []
  // Sản lượng đã xuất theo (tháng, mã hàng) → dựng phiếu nhập kho bù cho khỏi âm kho.
  const producedByMonth = new Map<string, Map<string, { item: Item; qty: Prisma.Decimal }>>()
  const materialByMonth = new Map<string, Map<string, { item: Item; qty: Prisma.Decimal }>>()
  const track = (
    store: Map<string, Map<string, { item: Item; qty: Prisma.Decimal }>>,
    date: Date,
    item: Item,
    qty: Prisma.Decimal,
  ) => {
    const key = date.toISOString().slice(0, 7)
    const month = store.get(key) ?? new Map()
    month.set(item.code, { item, qty: (month.get(item.code)?.qty ?? ZERO).add(qty) })
    store.set(key, month)
  }

  for (const v of issues) {
    const r = rng(v.voucherNo)
    if (v.category === GoodsIssueCategory.SALES) {
      const invoice = v.description?.match(/hóa đơn số\s*0*(\d+)/i)?.[1] ?? null
      const matched = invoice ? byInvoice.get(invoice) : undefined
      const rows =
        matched ?? [{ item: pick(concrete, r()), qty: D(1) }] // không dò được hóa đơn → 1 dòng tối thiểu
      rows.forEach((row, i) => {
        issueLines.push({
          id: randomUUID(),
          voucherId: v.id,
          lineNo: i + 1,
          itemId: row.item.code,
          itemName: row.item.name,
          unit: row.item.unit,
          warehouseId: WH_FINISHED,
          debitAccount: '632',
          creditAccount: '156',
          quantity: row.qty,
          // Giá vốn để 0 như dữ liệu nhập khẩu — KHÔNG bịa chi phí vào KQKD.
          unitPrice: ZERO,
          amount: ZERO,
        })
        track(producedByMonth, v.postingDate, row.item, row.qty)
      })
    } else {
      // Xuất NVL cho sản xuất: xi măng/cát/đá/phụ gia, Σ thành tiền = tổng cũ.
      const pool = material.slice(0, 5)
      const parts = split(v.totalAmount, pool.length, r)
      pool.forEach((item, i) => {
        const amount = parts[i]!
        const qty = qtyOf(amount, item.price)
        issueLines.push({
          id: randomUUID(),
          voucherId: v.id,
          lineNo: i + 1,
          itemId: item.code,
          itemName: item.name,
          unit: item.unit,
          warehouseId: WH_MATERIAL,
          debitAccount: '154',
          creditAccount: '152',
          quantity: qty,
          unitPrice: amount.div(qty).toDecimalPlaces(2),
          amount,
        })
        track(materialByMonth, v.postingDate, item, qty)
      })
    }
  }

  await prisma.goodsIssueLine.deleteMany({})
  for (let i = 0; i < issueLines.length; i += CHUNK)
    await prisma.goodsIssueLine.createMany({ data: issueLines.slice(i, i + CHUNK) })
  console.log(`Xuất kho: ${issueLines.length} dòng / ${issues.length} chứng từ`)

  // 3) Nhập kho thành phẩm — 1 phiếu/tháng, SL = 105% lượng đã xuất (tồn kho không âm).
  const lastNo = await prisma.inventoryReceipt.findFirst({
    where: { voucherNo: { startsWith: 'NK' } },
    orderBy: { voucherNo: 'desc' },
    select: { voucherNo: true },
  })
  let seq = lastNo ? Number(lastNo.voucherNo.replace(/\D/g, '')) : 0

  // Nhập bù theo tháng, SL = 105% lượng đã xuất; tiền để 0 nên không đụng sổ cái.
  const buildReceipts = async (
    store: Map<string, Map<string, { item: Item; qty: Prisma.Decimal }>>,
    kind: 'finished' | 'material',
  ) => {
    const months = [...store.keys()].sort()
    for (const month of months) {
      // Ngày nhập = mùng 1 của tháng để luôn đứng trước các lần xuất trong tháng.
      const date = new Date(`${month}-01T00:00:00.000Z`)
      seq += 1
      await prisma.inventoryReceipt.create({
        data: {
          receiptType: kind === 'finished' ? 'FINISHED_GOODS' : 'PURCHASE',
          voucherNo: `NK${String(seq).padStart(5, '0')}`,
          postingDate: date,
          voucherDate: date,
          description:
            kind === 'finished'
              ? `Nhập kho thành phẩm sản xuất tháng ${month} (dữ liệu demo)`
              : `Nhập kho nguyên vật liệu tháng ${month} (dữ liệu demo)`,
          reference: MARKER,
          totalAmount: ZERO,
          posted: true,
          lines: {
            create: [...store.get(month)!.values()].map((row, i) => ({
              lineNo: i + 1,
              itemId: row.item.code,
              itemName: row.item.name,
              unit: row.item.unit,
              warehouseId: kind === 'finished' ? WH_FINISHED : WH_MATERIAL,
              debitAccount: kind === 'finished' ? '155' : '152',
              creditAccount: kind === 'finished' ? '154' : '331',
              quantity: row.qty.mul(D(1.05)).toDecimalPlaces(2),
              unitPrice: ZERO,
              amount: ZERO,
            })),
          },
        },
      })
    }
    return months
  }

  const mFinished = await buildReceipts(producedByMonth, 'finished')
  const mMaterial = await buildReceipts(materialByMonth, 'material')
  console.log(
    `Nhập kho demo: ${mFinished.length} phiếu thành phẩm, ${mMaterial.length} phiếu NVL (${mFinished.join(', ')})`,
  )

  // 4) Mua hàng + phiếu nhập kho mua hàng — gán mặt hàng NVL, giữ nguyên tiền.
  const purchaseLines = await prisma.purchaseVoucherLine.findMany({
    select: { id: true, voucherId: true, lineNo: true },
  })
  for (const l of purchaseLines) {
    const item = pick(material, rng(l.voucherId + l.lineNo)())
    await prisma.purchaseVoucherLine.update({
      where: { id: l.id },
      data: { itemId: item.code, itemName: item.name },
    })
  }
  const receiptLines = await prisma.inventoryReceiptLine.findMany({
    // reference NULL cũng phải lọt (Prisma `not` loại luôn NULL).
    where: { receipt: { OR: [{ reference: null }, { reference: { not: MARKER } }] } },
    select: { id: true, receiptId: true, lineNo: true, amount: true },
  })
  for (const l of receiptLines) {
    const item = pick(material, rng(l.receiptId + l.lineNo)())
    const qty = qtyOf(l.amount, item.price)
    await prisma.inventoryReceiptLine.update({
      where: { id: l.id },
      data: {
        itemId: item.code,
        itemName: item.name,
        unit: item.unit,
        warehouseId: WH_MATERIAL,
        quantity: qty,
        unitPrice: l.amount.div(qty).toDecimalPlaces(2),
      },
    })
  }
  console.log(`Mua hàng: ${purchaseLines.length} dòng, nhập kho mua hàng: ${receiptLines.length} dòng`)
}

async function main() {
  const undoOnly = process.argv.includes('--undo')
  console.log(undoOnly ? '↩︎  Hoàn tác chi tiết mặt hàng demo…' : '⚙️  Sinh chi tiết mặt hàng demo…')
  await undo() // apply cũng dọn lượt cũ trước → chạy lại bao nhiêu lần cũng ra một kết quả
  if (!undoOnly) await apply()
  console.log('Xong.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
