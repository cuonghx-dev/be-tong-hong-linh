import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { cleanVouchers, clearBookLock, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-PCB'
const YEAR = 2026
const DATE = `${YEAR}-04-10`
const FAKE_ID = '00000000-0000-4000-8000-000000000000'
const SUPPLIER = { code: `${TAG}-NCC01`, name: `${TAG} NCC nhánh lỗi`, type: 'ORG' }

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const serviceVoucher = (paymentMode: string, overrides: Record<string, unknown> = {}) => ({
  type: 'SERVICE',
  paymentMode,
  postingDate: DATE,
  voucherDate: DATE,
  supplierName: SUPPLIER.name,
  description: `${TAG} mua dịch vụ`,
  lines: [{ itemName: 'Dịch vụ bốc xếp', quantity: 1, unitPrice: 2000000 }],
  ...overrides,
})

describe('Purchase nhánh lỗi + phân bổ chi phí (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await clearBookLock(prismaOf(app))
    await request(app.getHttpServer())
      .post('/api/purchase/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send(SUPPLIER)
      .expect(201)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('nhánh 404 + validation dòng hàng', () => {
    it('GET/PATCH/DELETE/posted với id không tồn tại → 404', async () => {
      await http().get(`/api/purchase/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
      await http()
        .patch(`/api/purchase/vouchers/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ description: 'x' })
        .expect(404)
      await http()
        .patch(`/api/purchase/vouchers/${FAKE_ID}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(404)
      await http()
        .delete(`/api/purchase/vouchers/${FAKE_ID}`)
        .set('Authorization', auth())
        .expect(404)
    })

    it('mọi dòng đều SL 0 → 400 "Cần ít nhất 1 dòng hàng"', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { lines: [{ itemName: 'Ghi chú', quantity: 0, unitPrice: 0 }] }))
        .expect(400)
      expect(res.body.message).toContain('Cần ít nhất 1 dòng hàng')
    })

    it('dòng SL > 0 thiếu tên hàng → 400 "thiếu tên hàng"', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { lines: [{ quantity: 2, unitPrice: 1000 }] }))
        .expect(400)
      expect(res.body.message).toContain('thiếu tên hàng')
    })
  })

  describe('xem trước số chứng từ (next-no)', () => {
    it('SERVICE chưa thanh toán → dãy MDV kèm năm', async () => {
      const res = await http()
        .get(`/api/purchase/vouchers/next-no?type=SERVICE&voucherDate=${DATE}`)
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.voucherNo).toMatch(new RegExp(`^MDV\\d{4}/${YEAR}$`))
    })

    it('NON_STOCK trả ngay tiền mặt → dùng chung dãy PC', async () => {
      const res = await http()
        .get(`/api/purchase/vouchers/next-no?type=NON_STOCK&voucherDate=${DATE}&paymentMode=IMMEDIATE`)
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.voucherNo).toMatch(/^PC \d{4}\/2026$/)
    })

    it('STOCK không truyền voucherDate → dãy NK toàn cục', async () => {
      const res = await http()
        .get('/api/purchase/vouchers/next-no?type=STOCK')
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.voucherNo).toMatch(/^NK\d{5}$/)
    })
  })

  describe('hạn thanh toán (§10.5)', () => {
    it('creditDays = 30 → dueDate = ngày chứng từ + 30', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { creditDays: 30 }))
        .expect(201)
      expect(res.body.dueDate).toBe(`${YEAR}-05-10`)
    })

    it('dueDate truyền rõ → giữ nguyên, bỏ qua creditDays', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { creditDays: 30, dueDate: `${YEAR}-06-01` }))
        .expect(201)
      expect(res.body.dueDate).toBe(`${YEAR}-06-01`)
    })
  })

  describe('phân bổ chi phí mua hàng (§10.4)', () => {
    let costVoucherId: string
    let costVoucherNo: string
    let plainServiceId: string
    let voucherAId: string

    beforeAll(async () => {
      // Chứng từ chi phí hợp lệ: mua dịch vụ, isPurchaseCost, tổng 2.000.000.
      const cost = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { isPurchaseCost: true, description: `${TAG} CP mua hàng` }))
        .expect(201)
      costVoucherId = cost.body.id
      costVoucherNo = cost.body.voucherNo

      // Dịch vụ thường (không đánh dấu là chi phí) để test nhánh từ chối.
      const plain = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { description: `${TAG} DV thường` }))
        .expect(201)
      plainServiceId = plain.body.id
    })

    const nonStockWithAllocs = (allocs: unknown[], overrides: Record<string, unknown> = {}) => ({
      type: 'NON_STOCK',
      paymentMode: 'UNPAID',
      postingDate: DATE,
      voucherDate: DATE,
      supplierName: SUPPLIER.name,
      description: `${TAG} mua không qua kho`,
      lines: [{ itemName: 'Hàng A', quantity: 1, unitPrice: 3000000 }],
      costAllocations: allocs,
      ...overrides,
    })

    it('chọn trùng chứng từ CP → 400', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(
          nonStockWithAllocs([
            { costVoucherId, amount: 100000 },
            { costVoucherId, amount: 200000 },
          ]),
        )
        .expect(400)
      expect(res.body.message).toContain('bị chọn trùng')
    })

    it('chứng từ CP không tồn tại → 404', async () => {
      await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(nonStockWithAllocs([{ costVoucherId: FAKE_ID, amount: 100000 }]))
        .expect(404)
    })

    it('chứng từ CP chưa đánh dấu "Là chi phí mua hàng" → 400', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(nonStockWithAllocs([{ costVoucherId: plainServiceId, amount: 100000 }]))
        .expect(400)
      expect(res.body.message).toContain('chưa đánh dấu')
    })

    it('chứng từ CP không phải mua dịch vụ → 400', async () => {
      // Voucher NON_STOCK không thể làm chứng từ chi phí.
      const nonStock = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(nonStockWithAllocs([]))
        .expect(201)
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(nonStockWithAllocs([{ costVoucherId: nonStock.body.id, amount: 100000 }]))
        .expect(400)
      expect(res.body.message).toContain('không phải chứng từ mua dịch vụ')
    })

    it('phân bổ vượt tổng chi phí → 400 kèm số còn lại', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(nonStockWithAllocs([{ costVoucherId, amount: 2500000 }]))
        .expect(400)
      expect(res.body.message).toContain('vượt chi phí còn lại')
    })

    it('phân bổ hợp lệ → purchaseCost = Σ phân bổ, GT nhập kho cộng chi phí', async () => {
      const res = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(nonStockWithAllocs([{ costVoucherId, amount: 500000 }]))
        .expect(201)
      voucherAId = res.body.id
      expect(res.body.purchaseCost).toBe('500000')
      expect(res.body.stockValue).toBe('3500000')
      expect(res.body.costAllocations).toHaveLength(1)
      expect(res.body.costAllocations[0]).toMatchObject({
        costVoucherId,
        voucherNo: costVoucherNo,
        totalCost: '2000000',
        allocatedTotal: '500000',
        amount: '500000',
      })
    })

    it('cost-vouchers phản ánh lũy kế đã phân bổ + số còn lại', async () => {
      const res = await http()
        .get(`/api/purchase/vouchers/cost-vouchers?keyword=${encodeURIComponent(costVoucherNo)}`)
        .set('Authorization', auth())
        .expect(200)
      const row = res.body.find((r: { id: string }) => r.id === costVoucherId)
      expect(row).toMatchObject({ allocatedTotal: '500000', remaining: '1500000' })
    })

    it('update thay toàn bộ phân bổ → purchaseCost tính lại', async () => {
      const res = await http()
        .patch(`/api/purchase/vouchers/${voucherAId}`)
        .set('Authorization', auth())
        .send({ costAllocations: [{ costVoucherId, amount: 800000 }] })
        .expect(200)
      expect(res.body.purchaseCost).toBe('800000')
      expect(res.body.stockValue).toBe('3800000')
    })

    it('update phân bổ vượt phần còn lại (trừ chính phiếu đang sửa) → 400', async () => {
      await http()
        .patch(`/api/purchase/vouchers/${voucherAId}`)
        .set('Authorization', auth())
        .send({ costAllocations: [{ costVoucherId, amount: 2100000 }] })
        .expect(400)
    })

    it('update mảng phân bổ rỗng → giữ chi phí scalar hiện có', async () => {
      const res = await http()
        .patch(`/api/purchase/vouchers/${voucherAId}`)
        .set('Authorization', auth())
        .send({ costAllocations: [] })
        .expect(200)
      expect(res.body.costAllocations).toHaveLength(0)
      expect(res.body.purchaseCost).toBe('800000')
    })

    it('update chỉ purchaseCost scalar → stockValue = tiền hàng + chi phí mới', async () => {
      const res = await http()
        .patch(`/api/purchase/vouchers/${voucherAId}`)
        .set('Authorization', auth())
        .send({ purchaseCost: 100000 })
        .expect(200)
      expect(res.body.purchaseCost).toBe('100000')
      expect(res.body.stockValue).toBe('3100000')
    })

    it('xóa chứng từ CP đang được phân bổ → 400; gỡ phân bổ xong xóa được', async () => {
      // Gán lại 1 phân bổ để chặn xóa.
      await http()
        .patch(`/api/purchase/vouchers/${voucherAId}`)
        .set('Authorization', auth())
        .send({ costAllocations: [{ costVoucherId, amount: 300000 }] })
        .expect(200)
      const blocked = await http()
        .delete(`/api/purchase/vouchers/${costVoucherId}`)
        .set('Authorization', auth())
        .expect(400)
      expect(blocked.body.message).toContain('gỡ phân bổ trước khi xóa')

      await http()
        .patch(`/api/purchase/vouchers/${voucherAId}`)
        .set('Authorization', auth())
        .send({ costAllocations: [] })
        .expect(200)
      await http()
        .delete(`/api/purchase/vouchers/${costVoucherId}`)
        .set('Authorization', auth())
        .expect(200)
    })
  })

  describe('đổi tùy chọn thanh toán không kèm dòng mới', () => {
    it('UNPAID → IMMEDIATE: sinh PC, vế Có dòng cũ đổi 331 → 1111; đổi lại thì PC bị xóa', async () => {
      const created = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(serviceVoucher('UNPAID', { description: `${TAG} đổi thanh toán` }))
        .expect(201)
      expect(created.body.lines[0].payableAccount).toBe('331')

      const paid = await http()
        .patch(`/api/purchase/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ paymentMode: 'IMMEDIATE' })
        .expect(200)
      expect(paid.body.paymentStatus).toBe('PAID')
      expect(paid.body.lines[0].payableAccount).toBe('1111')
      expect(paid.body.paymentId).not.toBeNull()
      const pc = await prismaOf(app).cashVoucher.findUnique({ where: { id: paid.body.paymentId } })
      expect(pc).not.toBeNull()

      const unpaid = await http()
        .patch(`/api/purchase/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ paymentMode: 'UNPAID' })
        .expect(200)
      expect(unpaid.body.paymentStatus).toBe('UNPAID')
      expect(unpaid.body.paymentId).toBeNull()
      expect(unpaid.body.lines[0].payableAccount).toBe('331')
      const gone = await prismaOf(app).cashVoucher.findUnique({ where: { id: paid.body.paymentId } })
      expect(gone).toBeNull()
    })

    it('PC tự sinh gộp dòng thuế GTGT đầu vào theo TK thuế', async () => {
      const created = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(
          serviceVoucher('IMMEDIATE', {
            description: `${TAG} PC kèm thuế`,
            lines: [{ itemName: 'Dịch vụ kho bãi', quantity: 1, unitPrice: 1000000, vatRate: 10 }],
          }),
        )
        .expect(201)
      expect(created.body.totalVat).toBe('100000')

      const pc = await prismaOf(app).cashVoucher.findUnique({
        where: { id: created.body.paymentId },
        include: { lines: true },
      })
      const vatLine = pc!.lines.find((l) => l.description === 'Thuế GTGT đầu vào')
      expect(vatLine).toBeDefined()
      expect(vatLine!.debitAccount).toBe('1331')
      expect(vatLine!.amount.toString()).toBe('100000')
    })
  })

  describe('chứng từ nhập kho: đồng bộ phiếu nhập + lan trạng thái sổ', () => {
    let stockId: string
    let stockNo: string
    let receiptId: string

    const stockVoucher = () => ({
      type: 'STOCK',
      paymentMode: 'UNPAID',
      postingDate: DATE,
      voucherDate: DATE,
      supplierName: SUPPLIER.name,
      description: `${TAG} nhập kho`,
      lines: [
        {
          itemName: 'Xi măng PCB40',
          warehouseId: 'KHO VAT TU',
          quantity: 10,
          unitPrice: 90000,
        },
      ],
    })

    it('tạo STOCK → phiếu nhập tự sinh; update lines → phiếu nhập giữ số, số tiền mới', async () => {
      const created = await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send(stockVoucher())
        .expect(201)
      stockId = created.body.id
      stockNo = created.body.voucherNo
      receiptId = created.body.receiptId
      expect(receiptId).not.toBeNull()

      const updated = await http()
        .patch(`/api/purchase/vouchers/${stockId}`)
        .set('Authorization', auth())
        .send({
          lines: [
            {
              itemName: 'Xi măng PCB40',
              warehouseId: 'KHO VAT TU',
              quantity: 20,
              unitPrice: 90000,
            },
          ],
        })
        .expect(200)
      expect(updated.body.voucherNo).toBe(stockNo)

      const receipt = await prismaOf(app).inventoryReceipt.findFirst({
        where: { voucherNo: stockNo },
      })
      expect(receipt).not.toBeNull()
      expect(receipt!.totalAmount.toString()).toBe('1800000')
    })

    it('bỏ ghi sổ chứng từ mua → phiếu nhập tự sinh cùng về nháp', async () => {
      await http()
        .patch(`/api/purchase/vouchers/${stockId}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(200)
      const receipt = await prismaOf(app).inventoryReceipt.findFirst({
        where: { voucherNo: stockNo },
      })
      expect(receipt!.posted).toBe(false)

      await http()
        .patch(`/api/purchase/vouchers/${stockId}/posted`)
        .set('Authorization', auth())
        .send({ posted: true })
        .expect(200)
    })

    it('xóa chứng từ mua nhập kho → phiếu nhập tự sinh bị dọn theo', async () => {
      await http()
        .delete(`/api/purchase/vouchers/${stockId}`)
        .set('Authorization', auth())
        .expect(200)
      const receipt = await prismaOf(app).inventoryReceipt.findFirst({
        where: { voucherNo: stockNo },
      })
      expect(receipt).toBeNull()
    })
  })

  describe('list filter + import trong kỳ khóa sổ', () => {
    it('lọc theo type/supplierId/receiveStatus/paymentStatus/fromDate/toDate', async () => {
      const suppliers = await http()
        .get(`/api/purchase/suppliers?keyword=${TAG}`)
        .set('Authorization', auth())
        .expect(200)
      const supplierRowId = suppliers.body.data[0].id

      const res = await http()
        .get(
          `/api/purchase/vouchers?type=SERVICE&supplierId=${supplierRowId}&receiveStatus=NOT_RECEIVED&paymentStatus=UNPAID&fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&keyword=${TAG}`,
        )
        .set('Authorization', auth())
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('import bỏ qua chứng từ có ngày trong kỳ đã khóa sổ', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: `${YEAR}-01-31` })
        .expect(200)

      const buffer = buildXlsx([
        ['Số chứng từ', 'Ngày hạch toán', 'Số hóa đơn', 'Nhà cung cấp', 'Tổng tiền thanh toán', 'Chi phí mua hàng', 'Giá trị nhập kho', 'TT nhận hóa đơn', 'TT thanh toán'],
        [`MH-${TAG}-LOCK`, '2026-01-15', null, SUPPLIER.name, 1000000, 0, 0, 'Chưa nhận', 'Chưa thanh toán'],
        [`MH-${TAG}-OPEN`, '2026-03-20', null, SUPPLIER.name, 2000000, 0, 0, 'Chưa nhận', 'Chưa thanh toán'],
      ])
      const res = await http()
        .post('/api/purchase/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'mua-hang-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 1, skipped: 1 })

      const locked = await prismaOf(app).purchaseVoucher.findFirst({
        where: { voucherNo: `MH-${TAG}-LOCK` },
      })
      expect(locked).toBeNull()

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })
  })
})
