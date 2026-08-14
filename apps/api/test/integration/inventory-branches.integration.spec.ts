import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { cleanVouchers, clearBookLock, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-INVB'
const YEAR = 2026
const DATE = `${YEAR}-05-12`
const FAKE_ID = '00000000-0000-4000-8000-000000000000'
const CUSTOMER = { code: `${TAG}-KH01`, name: `${TAG} Khách hàng xuất kho` }

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Inventory nhánh lỗi + nhập khẩu (integration)', () => {
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

  const line = (overrides: Record<string, unknown> = {}) => ({
    itemId: 'BECHUADAU',
    itemName: 'Bể chứa nhiên liệu 15M3',
    warehouseId: 'KHO VAT TU',
    quantity: 2,
    unitPrice: 3000000,
    ...overrides,
  })

  describe('phiếu nhập kho — nhánh lỗi + định khoản mặc định', () => {
    it('GET/PATCH/DELETE/posted id không tồn tại → 404', async () => {
      await http().get(`/api/inventory/receipts/${FAKE_ID}`).set('Authorization', auth()).expect(404)
      await http()
        .patch(`/api/inventory/receipts/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ description: 'x' })
        .expect(404)
      await http()
        .patch(`/api/inventory/receipts/${FAKE_ID}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(404)
      await http()
        .delete(`/api/inventory/receipts/${FAKE_ID}`)
        .set('Authorization', auth())
        .expect(404)
    })

    it('mọi dòng SL 0 → 400; dòng SL > 0 thiếu tên hàng → 400', async () => {
      const empty = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send({
          receiptType: 'PURCHASE',
          postingDate: DATE,
          voucherDate: DATE,
          lines: [line({ quantity: 0, itemName: null })],
        })
        .expect(400)
      expect(empty.body.message).toContain('Cần ít nhất 1 dòng hàng')

      const noName = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send({
          receiptType: 'PURCHASE',
          postingDate: DATE,
          voucherDate: DATE,
          lines: [line({ itemName: '  ' })],
        })
        .expect(400)
      expect(noName.body.message).toContain('thiếu tên hàng')
    })

    it('PURCHASE có đối tượng → partnerType SUPPLIER, định khoản Nợ 156 / Có 331', async () => {
      const res = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send({
          receiptType: 'PURCHASE',
          postingDate: DATE,
          voucherDate: DATE,
          partnerName: 'NCC lẻ',
          description: `${TAG} nhập mua`,
          lines: [line()],
        })
        .expect(201)
      expect(res.body.partnerType).toBe('SUPPLIER')
      expect(res.body.lines[0].debitAccount).toBe('156')
      expect(res.body.lines[0].creditAccount).toBe('331')
      expect(res.body.totalAmount).toBe('6000000')
    })

    it('FINISHED_GOODS không đối tượng → partnerType null, định khoản Nợ 155 / Có 154', async () => {
      const res = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send({
          receiptType: 'FINISHED_GOODS',
          postingDate: DATE,
          voucherDate: DATE,
          description: `${TAG} nhập thành phẩm`,
          lines: [line()],
        })
        .expect(201)
      expect(res.body.partnerType).toBeNull()
      expect(res.body.lines[0].debitAccount).toBe('155')
      expect(res.body.lines[0].creditAccount).toBe('154')
    })

    it('update chỉ header (không kèm lines) → tổng tiền giữ nguyên', async () => {
      const created = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send({
          receiptType: 'PURCHASE',
          postingDate: DATE,
          voucherDate: DATE,
          description: `${TAG} sửa header`,
          lines: [line()],
        })
        .expect(201)

      const updated = await http()
        .patch(`/api/inventory/receipts/${created.body.id}`)
        .set('Authorization', auth())
        .send({ deliverer: 'Người giao mới', address: 'Số 1 Hà Nội' })
        .expect(200)
      expect(updated.body.deliverer).toBe('Người giao mới')
      expect(updated.body.totalAmount).toBe('6000000')
      expect(updated.body.voucherNo).toBe(created.body.voucherNo)
    })

    it('list lọc theo receiptType + khoảng ngày + keyword', async () => {
      const res = await http()
        .get(
          `/api/inventory/receipts?receiptType=PURCHASE&fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&keyword=${TAG}`,
        )
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1)
    })
  })

  describe('phiếu xuất kho — nhánh lỗi + định khoản theo lý do xuất', () => {
    it('GET/PATCH/DELETE/posted id không tồn tại → 404', async () => {
      await http().get(`/api/inventory/issues/${FAKE_ID}`).set('Authorization', auth()).expect(404)
      await http()
        .patch(`/api/inventory/issues/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ description: 'x' })
        .expect(404)
      await http()
        .patch(`/api/inventory/issues/${FAKE_ID}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(404)
      await http()
        .delete(`/api/inventory/issues/${FAKE_ID}`)
        .set('Authorization', auth())
        .expect(404)
    })

    it('customerId không có trong danh mục → 400', async () => {
      const res = await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send({
          category: 'SALES',
          postingDate: DATE,
          voucherDate: DATE,
          customerId: 'KH-KHONG-TON-TAI',
          lines: [line()],
        })
        .expect(400)
      expect(res.body.message).toContain('không tồn tại trong danh mục')
    })

    it('customerId gửi bằng MÃ → lưu row id, DTO trả customerCode', async () => {
      const res = await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send({
          category: 'SALES',
          postingDate: DATE,
          voucherDate: DATE,
          customerId: CUSTOMER.code,
          customerName: CUSTOMER.name,
          description: `${TAG} xuất bán`,
          lines: [line()],
        })
        .expect(201)
      expect(res.body.customerCode).toBe(CUSTOMER.code)
      expect(res.body.lines[0].debitAccount).toBe('632')
      expect(res.body.lines[0].creditAccount).toBe('156')
    })

    it('PRODUCTION → định khoản Nợ 154 / Có 152', async () => {
      const res = await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send({
          category: 'PRODUCTION',
          postingDate: DATE,
          voucherDate: DATE,
          description: `${TAG} xuất sản xuất`,
          lines: [line()],
        })
        .expect(201)
      expect(res.body.lines[0].debitAccount).toBe('154')
      expect(res.body.lines[0].creditAccount).toBe('152')
    })

    it('mọi dòng SL 0 → 400; dòng SL > 0 thiếu tên hàng → 400', async () => {
      await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send({
          category: 'SALES',
          postingDate: DATE,
          voucherDate: DATE,
          lines: [line({ quantity: 0, itemName: null })],
        })
        .expect(400)

      await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send({
          category: 'SALES',
          postingDate: DATE,
          voucherDate: DATE,
          lines: [line({ itemName: '   ' })],
        })
        .expect(400)
    })

    it('update đổi khách hàng bằng mã + list lọc category/ngày/keyword', async () => {
      const created = await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send({
          category: 'SALES',
          postingDate: DATE,
          voucherDate: DATE,
          description: `${TAG} xuất sửa KH`,
          lines: [line()],
        })
        .expect(201)

      const updated = await http()
        .patch(`/api/inventory/issues/${created.body.id}`)
        .set('Authorization', auth())
        .send({ customerId: CUSTOMER.code, receiver: 'Người nhận mới' })
        .expect(200)
      expect(updated.body.customerCode).toBe(CUSTOMER.code)
      expect(updated.body.receiver).toBe('Người nhận mới')

      const list = await http()
        .get(
          `/api/inventory/issues?category=SALES&fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&keyword=${TAG}`,
        )
        .set('Authorization', auth())
        .expect(200)
      expect(list.body.pagination.total).toBeGreaterThanOrEqual(1)
    })
  })

  describe('nhập khẩu xlsx nhập kho / xuất kho', () => {
    it('nhập kho: 2 phiếu mới (1 thành phẩm) + 1 trùng trong file; nhập lại → skipped hết', async () => {
      const buffer = buildXlsx([
        ['Ngày hạch toán', 'Số chứng từ', 'Diễn giải', 'Tổng tiền', 'Người giao', 'Loại chứng từ', 'Chi nhánh'],
        [
          '2026-05-01',
          `NK-${TAG}-01`,
          'Mua hàng của NCC Không Có theo hóa đơn số 123',
          5000000,
          'Anh Ba',
          'Nhập kho mua hàng',
          null,
        ],
        ['2026-05-02', `NK-${TAG}-02`, 'Nhập thành phẩm sản xuất', 7000000, null, 'Nhập kho thành phẩm sản xuất', null],
        ['2026-05-01', `NK-${TAG}-01`, 'Trùng trong file', 5000000, null, 'Nhập kho mua hàng', null],
      ])

      const first = await http()
        .post('/api/inventory/receipts/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'nhap-kho-it.xlsx')
        .expect(201)
      expect(first.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const again = await http()
        .post('/api/inventory/receipts/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'nhap-kho-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })

      const prisma = prismaOf(app)
      const purchase = await prisma.inventoryReceipt.findFirst({
        where: { voucherNo: `NK-${TAG}-01` },
        include: { lines: true },
      })
      // Tên NCC trích từ diễn giải "Mua hàng của <NCC> theo hóa đơn"; không có trong
      // danh mục nên partnerId null nhưng partnerName vẫn giữ tên trích được.
      expect(purchase!.receiptType).toBe('PURCHASE')
      expect(purchase!.partnerType).toBe('SUPPLIER')
      expect(purchase!.partnerName).toBe('NCC Không Có')
      expect(purchase!.lines[0]!.debitAccount).toBe('156')

      const finished = await prisma.inventoryReceipt.findFirst({
        where: { voucherNo: `NK-${TAG}-02` },
        include: { lines: true },
      })
      expect(finished!.receiptType).toBe('FINISHED_GOODS')
      expect(finished!.partnerType).toBeNull()
      expect(finished!.lines[0]!.debitAccount).toBe('155')
      expect(finished!.lines[0]!.creditAccount).toBe('154')
    })

    it('xuất kho: khớp người nhận với danh mục KH + loại sản xuất', async () => {
      const buffer = buildXlsx([
        ['Ngày hạch toán', 'Số chứng từ', 'Diễn giải', 'Tổng tiền', 'Người nhận', 'Đã lập CT bán hàng', 'TT Phát hành hóa đơn', 'Mã CQT cấp', 'Loại chứng từ'],
        ['2026-05-03', `XK-${TAG}-01`, 'Xuất bán', 4000000, CUSTOMER.name, 'Có', 'Đã phát hành', 'M1-26', 'Xuất kho bán hàng'],
        ['2026-05-04', `XK-${TAG}-02`, 'Xuất sản xuất', 2000000, null, null, null, null, 'Xuất kho cho sản xuất'],
      ])

      const res = await http()
        .post('/api/inventory/issues/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'xuat-kho-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const prisma = prismaOf(app)
      const sales = await prisma.goodsIssueVoucher.findFirst({
        where: { voucherNo: `XK-${TAG}-01` },
        include: { lines: true, customer: { select: { code: true } } },
      })
      expect(sales!.category).toBe('SALES')
      expect(sales!.customer?.code).toBe(CUSTOMER.code)
      expect(sales!.taxAuthorityCode).toBe('M1-26')
      expect(sales!.lines[0]!.debitAccount).toBe('632')

      const production = await prisma.goodsIssueVoucher.findFirst({
        where: { voucherNo: `XK-${TAG}-02` },
        include: { lines: true },
      })
      expect(production!.category).toBe('PRODUCTION')
      expect(production!.lines[0]!.debitAccount).toBe('154')
      expect(production!.lines[0]!.creditAccount).toBe('152')
    })

    it.each([
      ['/api/inventory/receipts/import'],
      ['/api/inventory/issues/import'],
    ])('%s: file không có header hợp lệ → total 0', async (route) => {
      const res = await http()
        .post(route)
        .set('Authorization', auth())
        .attach('file', buildXlsx([['Cột lạ'], ['x']]), 'rong.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
    })

    it('import bỏ qua phiếu có ngày trong kỳ đã khóa sổ', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: `${YEAR}-02-28` })
        .expect(200)

      const receipts = await http()
        .post('/api/inventory/receipts/import')
        .set('Authorization', auth())
        .attach(
          'file',
          buildXlsx([
            ['Ngày hạch toán', 'Số chứng từ', 'Diễn giải', 'Tổng tiền', 'Người giao', 'Loại chứng từ', 'Chi nhánh'],
            ['2026-01-20', `NK-${TAG}-LOCK`, 'Trong kỳ khóa', 1000000, null, 'Nhập kho mua hàng', null],
            ['2026-04-20', `NK-${TAG}-OPEN`, 'Ngoài kỳ khóa', 2000000, null, 'Nhập kho mua hàng', null],
          ]),
          'nhap-kho-lock.xlsx',
        )
        .expect(201)
      expect(receipts.body).toEqual({ total: 2, created: 1, skipped: 1 })

      const issues = await http()
        .post('/api/inventory/issues/import')
        .set('Authorization', auth())
        .attach(
          'file',
          buildXlsx([
            ['Ngày hạch toán', 'Số chứng từ', 'Diễn giải', 'Tổng tiền', 'Người nhận', 'Loại chứng từ'],
            ['2026-01-20', `XK-${TAG}-LOCK`, 'Trong kỳ khóa', 1000000, null, 'Xuất kho bán hàng'],
            ['2026-04-20', `XK-${TAG}-OPEN`, 'Ngoài kỳ khóa', 2000000, null, 'Xuất kho bán hàng'],
          ]),
          'xuat-kho-lock.xlsx',
        )
        .expect(201)
      expect(issues.body).toEqual({ total: 2, created: 1, skipped: 1 })

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })
  })
})
