import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { cleanVouchers, clearBookLock, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-SALB'
const YEAR = 2026
const DATE = `${YEAR}-09-14`
const FAKE_ID = '00000000-0000-4000-8000-000000000000'
const CUSTOMER = { code: `${TAG}-KH01`, name: `${TAG} Khách hàng nhánh lỗi` }

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const salesVoucher = (paymentMode: string, overrides: Record<string, unknown> = {}) => ({
  voucherType: 'DOMESTIC_GOODS',
  paymentMode,
  postingDate: DATE,
  voucherDate: DATE,
  customerId: CUSTOMER.code,
  customerName: CUSTOMER.name,
  description: `${TAG} bán hàng`,
  lines: [{ itemName: 'Hàng nhánh lỗi', quantity: 2, unitPrice: 500000 }],
  ...overrides,
})

describe('Sales nhánh lỗi + chứng từ tự sinh (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await clearBookLock(prismaOf(app))
    await request(app.getHttpServer())
      .post('/api/sales/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(CUSTOMER)
      .expect(201)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('nhánh lỗi', () => {
    it('GET/PATCH/DELETE/posted id không tồn tại → 404', async () => {
      await http().get(`/api/sales/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
      await http()
        .patch(`/api/sales/vouchers/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ description: 'x' })
        .expect(404)
      await http()
        .patch(`/api/sales/vouchers/${FAKE_ID}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(404)
      await http().delete(`/api/sales/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
    })

    it('customerId không có trong danh mục → 400 (cả create lẫn update)', async () => {
      const created = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { customerId: 'KH-KHONG-TON-TAI' }))
        .expect(400)
      expect(created.body.message).toContain('không tồn tại trong danh mục')

      const ok = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID'))
        .expect(201)
      await http()
        .patch(`/api/sales/vouchers/${ok.body.id}`)
        .set('Authorization', auth())
        .send({ customerId: 'KH-KHONG-TON-TAI' })
        .expect(400)
    })

    it('update customerId rỗng → gỡ liên kết khách hàng', async () => {
      const created = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { description: `${TAG} gỡ KH` }))
        .expect(201)
      expect(created.body.customerId).not.toBeNull()

      const updated = await http()
        .patch(`/api/sales/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ customerId: '' })
        .expect(200)
      expect(updated.body.customerId).toBeNull()
    })

    it('mọi dòng SL 0 → 400; dòng SL > 0 thiếu tên hàng → 400', async () => {
      const empty = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { lines: [{ itemName: 'Ghi chú', quantity: 0, unitPrice: 0 }] }))
        .expect(400)
      expect(empty.body.message).toContain('Cần ít nhất 1 dòng hàng')

      const noName = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { lines: [{ quantity: 1, unitPrice: 1000 }] }))
        .expect(400)
      expect(noName.body.message).toContain('thiếu tên hàng')
    })
  })

  describe('định khoản + chiết khấu + hạn thanh toán', () => {
    it('UNPAID → TK Nợ 131; PAID_NOW → TK Nợ 1111', async () => {
      const unpaid = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { description: `${TAG} công nợ` }))
        .expect(201)
      expect(unpaid.body.lines[0].debtAccount).toBe('131')

      const paid = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('PAID_NOW', { description: `${TAG} thu ngay` }))
        .expect(201)
      expect(paid.body.lines[0].debtAccount).toBe('1111')
    })

    it('chiết khấu thương mại trừ vào thành tiền; thuế tính trên số sau chiết khấu', async () => {
      const res = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(
          salesVoucher('UNPAID', {
            description: `${TAG} chiết khấu`,
            lines: [
              { itemName: 'Hàng CK', quantity: 2, unitPrice: 500000, tradeDiscount: 100000, vatRate: 10 },
            ],
          }),
        )
        .expect(201)
      expect(res.body.lines[0].amount).toBe('900000')
      expect(res.body.lines[0].vatAmount).toBe('90000')
      expect(res.body.totalAmount).toBe('990000')
    })

    // Khác chứng từ mua hàng (§10.5 tự suy hạn TT từ creditDays): bên bán hàng
    // hạn TT chỉ lấy từ dueDate người dùng nhập, creditDays chỉ lưu để tham chiếu.
    it('hạn TT lấy từ dueDate; chỉ có creditDays thì dueDate vẫn rỗng', async () => {
      const onlyCreditDays = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { creditDays: 15, description: `${TAG} chỉ số ngày nợ` }))
        .expect(201)
      expect(onlyCreditDays.body.creditDays).toBe(15)
      expect(onlyCreditDays.body.dueDate).toBeNull()

      const withDueDate = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(
          salesVoucher('UNPAID', {
            creditDays: 15,
            dueDate: `${YEAR}-09-29`,
            description: `${TAG} hạn TT`,
          }),
        )
        .expect(201)
      expect(withDueDate.body.dueDate).toBe(`${YEAR}-09-29`)
    })
  })

  describe('chứng từ tự sinh: đổi tùy chọn thanh toán + lan trạng thái sổ', () => {
    let voucherId: string
    let receiptId: string

    it('UNPAID → PAID_NOW: sinh PT, dòng đổi 131 → 1111', async () => {
      const created = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(salesVoucher('UNPAID', { description: `${TAG} đổi thanh toán` }))
        .expect(201)
      voucherId = created.body.id
      expect(created.body.receiptId).toBeNull()

      const paid = await http()
        .patch(`/api/sales/vouchers/${voucherId}`)
        .set('Authorization', auth())
        .send({
          paymentMode: 'PAID_NOW',
          lines: [{ itemName: 'Hàng nhánh lỗi', quantity: 2, unitPrice: 500000 }],
        })
        .expect(200)
      receiptId = paid.body.receiptId
      expect(receiptId).not.toBeNull()
      expect(paid.body.lines[0].debtAccount).toBe('1111')

      const pt = await prismaOf(app).cashVoucher.findUnique({ where: { id: receiptId } })
      expect(pt!.category).toBe('SALES_CASH')
    })

    it('bỏ ghi chứng từ bán → PT tự sinh cùng về nháp', async () => {
      await http()
        .patch(`/api/sales/vouchers/${voucherId}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(200)
      const pt = await prismaOf(app).cashVoucher.findUnique({ where: { id: receiptId } })
      expect(pt!.posted).toBe(false)

      await http()
        .patch(`/api/sales/vouchers/${voucherId}/posted`)
        .set('Authorization', auth())
        .send({ posted: true })
        .expect(200)
    })

    it('PAID_NOW → UNPAID: PT tự sinh bị xóa, dòng về 131', async () => {
      const unpaid = await http()
        .patch(`/api/sales/vouchers/${voucherId}`)
        .set('Authorization', auth())
        .send({
          paymentMode: 'UNPAID',
          lines: [{ itemName: 'Hàng nhánh lỗi', quantity: 2, unitPrice: 500000 }],
        })
        .expect(200)
      expect(unpaid.body.receiptId).toBeNull()
      expect(unpaid.body.lines[0].debtAccount).toBe('131')

      const pt = await prismaOf(app).cashVoucher.findUnique({ where: { id: receiptId } })
      expect(pt).toBeNull()
    })

    it('PT tự sinh gộp dòng thuế GTGT đầu ra theo TK thuế', async () => {
      const created = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(
          salesVoucher('PAID_NOW', {
            description: `${TAG} PT kèm thuế`,
            lines: [{ itemName: 'Hàng có thuế', quantity: 1, unitPrice: 1000000, vatRate: 10 }],
          }),
        )
        .expect(201)

      const pt = await prismaOf(app).cashVoucher.findUnique({
        where: { id: created.body.receiptId },
        include: { lines: true },
      })
      const vatLine = pt!.lines.find((l) => l.description === 'Thuế GTGT đầu ra')
      expect(vatLine).toBeDefined()
      expect(vatLine!.amount.toString()).toBe('100000')
    })

    it('xóa chứng từ bán kiêm phiếu xuất → PT + phiếu xuất bị dọn theo', async () => {
      const created = await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send(
          salesVoucher('PAID_NOW', {
            isInventoryIssue: true,
            description: `${TAG} xóa kèm`,
            lines: [
              {
                itemId: 'BECHUADAU',
                itemName: 'Bể chứa nhiên liệu 15M3',
                warehouseId: 'KHO VAT TU',
                quantity: 1,
                unitPrice: 4000000,
              },
            ],
          }),
        )
        .expect(201)
      const { id, receiptId: ptId, issueId } = created.body
      expect(ptId).not.toBeNull()
      expect(issueId).not.toBeNull()

      await http().delete(`/api/sales/vouchers/${id}`).set('Authorization', auth()).expect(200)

      const prisma = prismaOf(app)
      expect(await prisma.cashVoucher.findUnique({ where: { id: ptId } })).toBeNull()
      expect(await prisma.goodsIssueVoucher.findUnique({ where: { id: issueId } })).toBeNull()
    })
  })

  describe('list filter + import xlsx', () => {
    it('lọc theo voucherType/paymentMode/customerId/ngày/keyword', async () => {
      const customers = await http()
        .get(`/api/sales/customers?keyword=${TAG}`)
        .set('Authorization', auth())
        .expect(200)
      const customerRowId = customers.body.data[0].id

      const res = await http()
        .get(
          `/api/sales/vouchers?voucherType=DOMESTIC_GOODS&paymentMode=UNPAID&customerId=${customerRowId}&fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&keyword=${TAG}&pageSize=50`,
        )
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1)
    })

    it('import: chứng từ mới + trùng trong file; nhập lại → skipped hết', async () => {
      const header = [
        'Số chứng từ',
        'Số hóa đơn',
        'Ngày hạch toán',
        'Khách hàng',
        'Tổng tiền thanh toán',
        'TT lập hóa đơn',
        'TT thanh toán',
        'TT xuất hàng',
        'Chi nhánh',
      ]
      const buffer = buildXlsx([
        header,
        [`BH-${TAG}-01`, 'HD001', '2026-09-01', CUSTOMER.name, 3000000, 'Đã lập', 'Chưa thanh toán', 'Chưa xuất', null],
        [`BH-${TAG}-01`, 'HD001', '2026-09-01', CUSTOMER.name, 3000000, 'Đã lập', 'Chưa thanh toán', 'Chưa xuất', null],
        [`BH-${TAG}-02`, 'HD002', '2026-09-02', 'Khách lẻ ngoài danh mục', 1500000, null, 'Đã thanh toán', 'Đã xuất', null],
      ])

      const first = await http()
        .post('/api/sales/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ban-hang-it.xlsx')
        .expect(201)
      expect(first.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const again = await http()
        .post('/api/sales/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ban-hang-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })

      // Khách có trong danh mục → gắn customerId; khách lẻ → chỉ giữ tên.
      const prisma = prismaOf(app)
      const known = await prisma.salesVoucher.findFirst({
        where: { voucherNo: `BH-${TAG}-01` },
        include: { customer: { select: { code: true } } },
      })
      expect(known!.customer?.code).toBe(CUSTOMER.code)
      const walkIn = await prisma.salesVoucher.findFirst({
        where: { voucherNo: `BH-${TAG}-02` },
      })
      expect(walkIn!.customerId).toBeNull()
      expect(walkIn!.customerName).toBe('Khách lẻ ngoài danh mục')
    })

    it('file không có header hợp lệ → total 0', async () => {
      const res = await http()
        .post('/api/sales/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buildXlsx([['Cột lạ'], ['x']]), 'rong.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
    })

    it('import bỏ qua chứng từ trong kỳ đã khóa sổ', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: `${YEAR}-02-28` })
        .expect(200)

      const res = await http()
        .post('/api/sales/vouchers/import')
        .set('Authorization', auth())
        .attach(
          'file',
          buildXlsx([
            ['Số chứng từ', 'Ngày hạch toán', 'Khách hàng', 'Tổng tiền thanh toán', 'TT thanh toán'],
            [`BH-${TAG}-LOCK`, '2026-01-10', CUSTOMER.name, 1000000, 'Chưa thanh toán'],
            [`BH-${TAG}-OPEN`, '2026-08-10', CUSTOMER.name, 2000000, 'Chưa thanh toán'],
          ]),
          'ban-hang-lock.xlsx',
        )
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 1, skipped: 1 })

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })
  })
})
