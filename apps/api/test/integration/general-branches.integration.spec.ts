import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { cleanVouchers, clearBookLock } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-NVKB'
const YEAR = 2026
const DATE = `${YEAR}-07-09`
const FAKE_ID = '00000000-0000-4000-8000-000000000000'

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const nvkPayload = (overrides: Record<string, unknown> = {}) => ({
  postingDate: DATE,
  voucherDate: DATE,
  description: `${TAG} nghiệp vụ khác`,
  lines: [{ debitAccount: '632', creditAccount: '154', amount: 1200000 }],
  ...overrides,
})

describe('General NVK — nhánh lỗi + tab thuế (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await clearBookLock(prismaOf(app))
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('validation định khoản', () => {
    it('TK Nợ trùng TK Có → 400', async () => {
      const res = await http()
        .post('/api/general/vouchers')
        .set('Authorization', auth())
        .send(nvkPayload({ lines: [{ debitAccount: '632', creditAccount: '632', amount: 100000 }] }))
        .expect(400)
      expect(res.body.message).toContain('TK Nợ và TK Có không được trùng nhau')
    })

    it('TK không có trong hệ thống tài khoản → 400 liệt kê mã thiếu', async () => {
      const res = await http()
        .post('/api/general/vouchers')
        .set('Authorization', auth())
        .send(nvkPayload({ lines: [{ debitAccount: '99998', creditAccount: '154', amount: 100000 }] }))
        .expect(400)
      expect(res.body.message).toContain('99998')
    })

    it('update sang TK không tồn tại → 400, chứng từ giữ nguyên', async () => {
      const created = await http()
        .post('/api/general/vouchers')
        .set('Authorization', auth())
        .send(nvkPayload({ description: `${TAG} giữ nguyên` }))
        .expect(201)

      await http()
        .patch(`/api/general/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ lines: [{ debitAccount: '99997', creditAccount: '154', amount: 100000 }] })
        .expect(400)

      const after = await http()
        .get(`/api/general/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .expect(200)
      expect(after.body.totalAmount).toBe('1200000')
    })
  })

  describe('nhánh 404', () => {
    it('GET/PATCH/DELETE/posted id không tồn tại → 404', async () => {
      await http().get(`/api/general/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
      await http()
        .patch(`/api/general/vouchers/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ description: 'x' })
        .expect(404)
      await http()
        .patch(`/api/general/vouchers/${FAKE_ID}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(404)
      await http()
        .delete(`/api/general/vouchers/${FAKE_ID}`)
        .set('Authorization', auth())
        .expect(404)
    })
  })

  describe('tab thuế GTGT + đối tượng Nợ/Có + hạn thanh toán', () => {
    let voucherId: string

    it('create kèm taxLines → dòng trắng bị bỏ, dòng có số được lưu', async () => {
      const res = await http()
        .post('/api/general/vouchers')
        .set('Authorization', auth())
        .send(
          nvkPayload({
            description: `${TAG} có thuế`,
            dueDate: `${YEAR}-08-09`,
            referenceNo: 'HD-001',
            lines: [
              {
                debitAccount: '632',
                creditAccount: '154',
                amount: 1200000,
                debitPartnerId: 'KH-A',
                debitPartnerName: 'Khách A',
                creditPartnerId: 'NCC-B',
                creditPartnerName: 'NCC B',
              },
            ],
            taxLines: [
              { description: 'Hóa đơn A', taxableAmount: 1000000, vatAmount: 100000 },
              // Dòng trắng (không tiền thuế lẫn giá trị HHDV) → bị lọc bỏ.
              { description: 'Dòng trắng', taxableAmount: 0, vatAmount: 0 },
            ],
          }),
        )
        .expect(201)
      voucherId = res.body.id
      expect(res.body.taxLines).toHaveLength(1)
      expect(res.body.taxLines[0].taxableAmount).toBe('1000000')
      expect(res.body.dueDate).toBe(`${YEAR}-08-09`)
      expect(res.body.referenceNo).toBe('HD-001')
      expect(res.body.lines[0].debitPartnerName).toBe('Khách A')
      expect(res.body.lines[0].creditPartnerName).toBe('NCC B')
    })

    it('update taxLines = [] → bỏ toàn bộ kê khai thuế', async () => {
      const res = await http()
        .patch(`/api/general/vouchers/${voucherId}`)
        .set('Authorization', auth())
        .send({ taxLines: [] })
        .expect(200)
      expect(res.body.taxLines).toHaveLength(0)
    })

    it('update chỉ header (không lines) → tổng tiền giữ nguyên', async () => {
      const res = await http()
        .patch(`/api/general/vouchers/${voucherId}`)
        .set('Authorization', auth())
        .send({ description: `${TAG} sửa mô tả`, referenceNo: 'HD-002' })
        .expect(200)
      expect(res.body.totalAmount).toBe('1200000')
      expect(res.body.referenceNo).toBe('HD-002')
    })
  })

  describe('list filter + import trong kỳ khóa sổ', () => {
    it('lọc theo khoảng ngày + keyword', async () => {
      const res = await http()
        .get(
          `/api/general/vouchers?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&keyword=${TAG}&pageSize=50`,
        )
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1)
    })

    it('file không có header hợp lệ → total 0', async () => {
      const res = await http()
        .post('/api/general/vouchers/import')
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
        .post('/api/general/vouchers/import')
        .set('Authorization', auth())
        .attach(
          'file',
          buildXlsx([
            ['Ngày hạch toán', 'Ngày chứng từ', 'Số chứng từ', 'Diễn giải', 'Số tiền'],
            ['2026-01-15', '2026-01-15', `NVK-${TAG}-LOCK`, 'Trong kỳ khóa', 500000],
            ['2026-06-15', '2026-06-15', `NVK-${TAG}-OPEN`, 'Ngoài kỳ khóa', 800000],
          ]),
          'nvk-lock.xlsx',
        )
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 1, skipped: 1 })

      const locked = await prismaOf(app).generalVoucher.findFirst({
        where: { voucherNo: `NVK-${TAG}-LOCK` },
      })
      expect(locked).toBeNull()

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })

    it('khóa sổ chặn create / update / posted / delete NVK', async () => {
      const created = await http()
        .post('/api/general/vouchers')
        .set('Authorization', auth())
        .send(nvkPayload({ postingDate: `${YEAR}-01-20`, voucherDate: `${YEAR}-01-20` }))
        .expect(201)

      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: `${YEAR}-02-28` })
        .expect(200)

      await http()
        .post('/api/general/vouchers')
        .set('Authorization', auth())
        .send(nvkPayload({ postingDate: `${YEAR}-01-25`, voucherDate: `${YEAR}-01-25` }))
        .expect(400)
      await http()
        .patch(`/api/general/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ description: 'sửa trong kỳ khóa' })
        .expect(400)
      await http()
        .patch(`/api/general/vouchers/${created.body.id}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(400)
      await http()
        .delete(`/api/general/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .expect(400)

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })
  })
})
