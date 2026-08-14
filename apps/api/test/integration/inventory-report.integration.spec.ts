import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Phủ nhánh của InventoryReportService: lọc kho / lọc keyword / tồn đầu kỳ khai báo
// (inventory_opening_balances — seed không có nên spec tự tạo rồi dọn), phát sinh
// trước kỳ vs trong kỳ, dòng nhập vs xuất trong sổ chi tiết, và kỳ báo cáo sai.
const TAG = 'IT-INVRPT'
const YEAR = 2026
const PREV = `${YEAR - 1}-12-20` // trước kỳ → dồn vào tồn đầu kỳ
const IN = `${YEAR}-03-10` // trong kỳ
const FROM = `${YEAR}-01-01`
const TO = `${YEAR}-12-31`

const WH_A = 'KHO VAT TU'
const WH_B = 'KHO NHIENLIEU'
const ITEM_A = 'BECHUADAU' // "Bể chứa nhiên liệu 15M3"
const ITEM_B = 'DAU_15W40' // "Dầu PLC 15W40"

describe('Inventory reports — nhánh lọc (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const receipt = (
    itemId: string,
    warehouseId: string,
    date: string,
    quantity: number,
    unitPrice: number,
  ) =>
    http()
      .post('/api/inventory/receipts')
      .set('Authorization', auth())
      .send({
        receiptType: 'PURCHASE',
        postingDate: date,
        voucherDate: date,
        description: `${TAG} nhập ${itemId}`,
        lines: [{ itemId, itemName: itemId, warehouseId, quantity, unitPrice }],
      })
      .expect(201)

  const issue = (
    itemId: string,
    warehouseId: string,
    date: string,
    quantity: number,
    unitPrice: number,
  ) =>
    http()
      .post('/api/inventory/issues')
      .set('Authorization', auth())
      .send({
        category: 'SALES',
        postingDate: date,
        voucherDate: date,
        description: `${TAG} xuất ${itemId}`,
        lines: [{ itemId, itemName: itemId, warehouseId, quantity, unitPrice }],
      })
      .expect(201)

  const stockSummary = (query: string) =>
    http()
      .get(`/api/inventory/reports/stock-summary?fromDate=${FROM}&toDate=${TO}${query}`)
      .set('Authorization', auth())
      .expect(200)

  const itemLedger = (itemCode: string, query = '') =>
    http()
      .get(
        `/api/inventory/reports/item-ledger?fromDate=${FROM}&toDate=${TO}&itemCode=${encodeURIComponent(itemCode)}${query}`,
      )
      .set('Authorization', auth())
      .expect(200)

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)

    // Tồn đầu kỳ khai báo: ITEM_A ở WH_A (nhánh declaredByItem/declaredForItem có dữ liệu).
    const productA = await prisma.product.findUniqueOrThrow({ where: { code: ITEM_A } })
    await prisma.inventoryOpeningBalance.create({
      data: { productId: productA.id, warehouseCode: WH_A, quantity: 5, amount: 10_000_000 },
    })

    // Phát sinh trước kỳ (netMovementByItem với posting_date < from).
    await receipt(ITEM_A, WH_A, PREV, 2, 1_000_000)
    // Phát sinh trong kỳ: nhập + xuất ở WH_A, và 1 nhập ở WH_B để kiểm tra lọc kho.
    await receipt(ITEM_A, WH_A, IN, 3, 2_000_000)
    await issue(ITEM_A, WH_A, IN, 1, 2_000_000)
    await receipt(ITEM_B, WH_B, IN, 10, 100_000)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await prisma.inventoryOpeningBalance.deleteMany({ where: { warehouseCode: WH_A } })
    await app.close()
  })

  describe('stock-summary', () => {
    it('không lọc → gộp tồn khai báo + phát sinh trước kỳ vào đầu kỳ', async () => {
      const res = await stockSummary('')
      const rows: { itemCode: string }[] = res.body.rows
      const a = rows.find((r) => r.itemCode === ITEM_A) as unknown as Record<string, string>
      const b = rows.find((r) => r.itemCode === ITEM_B)
      expect(a).toBeDefined()
      expect(b).toBeDefined()

      // Đầu kỳ = khai báo (5 / 10tr) + nhập trước kỳ (2 / 2tr).
      expect(Number(a.openingQty)).toBe(7)
      expect(Number(a.openingAmount)).toBe(12_000_000)
      // Trong kỳ: nhập 3 (6tr), xuất 1 (2tr) → cuối kỳ 9 / 16tr.
      expect(Number(a.inQty)).toBe(3)
      expect(Number(a.inAmount)).toBe(6_000_000)
      expect(Number(a.outQty)).toBe(1)
      expect(Number(a.outAmount)).toBe(2_000_000)
      expect(Number(a.closingQty)).toBe(9)
      expect(Number(a.closingAmount)).toBe(16_000_000)

      // Tổng cộng của báo cáo là tổng tiền các dòng.
      expect(Number(res.body.totalInAmount)).toBeGreaterThanOrEqual(7_000_000)
      expect(res.body.fromDate).toBe(FROM)
      expect(res.body.toDate).toBe(TO)
    })

    it('lọc theo kho → chỉ VTHH của kho đó', async () => {
      const resB = await stockSummary(`&warehouseCode=${encodeURIComponent(WH_B)}`)
      const codes: string[] = resB.body.rows.map((r: { itemCode: string }) => r.itemCode)
      expect(codes).toContain(ITEM_B)
      expect(codes).not.toContain(ITEM_A)

      const resA = await stockSummary(`&warehouseCode=${encodeURIComponent(WH_A)}`)
      const codesA: string[] = resA.body.rows.map((r: { itemCode: string }) => r.itemCode)
      expect(codesA).toContain(ITEM_A)
      expect(codesA).not.toContain(ITEM_B)
    })

    it('keyword khớp mã / khớp tên / không khớp', async () => {
      const byCode = await stockSummary(`&keyword=${ITEM_B}`)
      expect(byCode.body.rows.map((r: { itemCode: string }) => r.itemCode)).toEqual([ITEM_B])

      // "PLC 15W40" chỉ có trong tên VTHH, không có trong mã.
      const byName = await stockSummary(`&keyword=${encodeURIComponent('plc 15w40')}`)
      expect(byName.body.rows.map((r: { itemCode: string }) => r.itemCode)).toEqual([ITEM_B])

      const noHit = await stockSummary(`&keyword=${TAG}-khong-ton-tai`)
      expect(noHit.body.rows).toHaveLength(0)
      expect(Number(noHit.body.totalClosingAmount)).toBe(0)
    })

    it('kỳ trước mọi phát sinh → chỉ còn tồn khai báo, VTHH không số dư bị loại', async () => {
      const res = await http()
        .get(`/api/inventory/reports/stock-summary?fromDate=2000-01-01&toDate=2000-12-31`)
        .set('Authorization', auth())
        .expect(200)
      const rows: Record<string, string>[] = res.body.rows
      // Tồn khai báo không gắn ngày → vẫn hiện; ITEM_B chỉ có phát sinh 2026 → mọi số 0 → bị loại.
      expect(rows.map((r) => r.itemCode)).toEqual([ITEM_A])
      expect(Number(rows[0]!.openingQty)).toBe(5)
      expect(Number(rows[0]!.inQty)).toBe(0)
      expect(Number(rows[0]!.outQty)).toBe(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/inventory/reports/stock-summary?fromDate=${TO}&toDate=${FROM}`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('item-ledger', () => {
    it('trả dòng nhập và dòng xuất, số dư lũy kế theo thứ tự ghi sổ', async () => {
      const res = await itemLedger(ITEM_A)
      expect(res.body.itemCode).toBe(ITEM_A)
      expect(res.body.itemName).toBe('Bể chứa nhiên liệu 15M3')
      expect(Number(res.body.openingQty)).toBe(7)
      expect(Number(res.body.openingAmount)).toBe(12_000_000)

      const rows: {
        voucherKind: string
        inQty: string
        outQty: string
        balanceQty: string
        counterAccount: string
      }[] = res.body.rows
      expect(rows).toHaveLength(2)
      const kinds = rows.map((r) => r.voucherKind).sort()
      expect(kinds).toEqual(['ISSUE', 'RECEIPT'])

      const receiptRow = rows.find((r) => r.voucherKind === 'RECEIPT')!
      const issueRow = rows.find((r) => r.voucherKind === 'ISSUE')!
      expect(Number(receiptRow.inQty)).toBe(3)
      expect(Number(receiptRow.outQty)).toBe(0)
      expect(Number(issueRow.outQty)).toBe(1)
      expect(Number(issueRow.inQty)).toBe(0)
      // TK đối ứng: nhập lấy TK Có, xuất lấy TK Nợ — cả 2 phải có giá trị.
      expect(receiptRow.counterAccount).not.toBe('')
      expect(issueRow.counterAccount).not.toBe('')

      // Số dư dòng cuối = tồn cuối kỳ.
      expect(rows[rows.length - 1]!.balanceQty).toBe(res.body.closingQty)
      expect(Number(res.body.closingQty)).toBe(9)
      expect(Number(res.body.totalInQty)).toBe(3)
      expect(Number(res.body.totalOutQty)).toBe(1)
    })

    it('lọc kho khác → không còn phát sinh lẫn tồn đầu kỳ', async () => {
      const res = await itemLedger(ITEM_A, `&warehouseCode=${encodeURIComponent(WH_B)}`)
      expect(res.body.rows).toHaveLength(0)
      expect(Number(res.body.openingQty)).toBe(0)
      expect(Number(res.body.closingQty)).toBe(0)
    })

    it('VTHH không có trong danh mục → tên/ĐVT null, không có dòng', async () => {
      const res = await itemLedger(`${TAG}-KHONG-CO`)
      expect(res.body.itemName).toBeNull()
      expect(res.body.unit).toBeNull()
      expect(res.body.rows).toHaveLength(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(
          `/api/inventory/reports/item-ledger?fromDate=${TO}&toDate=${FROM}&itemCode=${ITEM_A}`,
        )
        .set('Authorization', auth())
        .expect(400)
    })
  })
})
