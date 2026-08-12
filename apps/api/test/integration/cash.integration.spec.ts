import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-cash'
const YEAR = 2026
const DATE = `${YEAR}-03-15`

describe('Cash vouchers (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    // Spec này assert số phiếu tuyệt đối (PT0001…) nên cần bảng trống.
    await cleanVouchers(prismaOf(app))
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('GET next-no', () => {
    it('RECEIPT → PT0001/<năm>; PAYMENT → "PC 0001/<năm>" (có dấu cách)', async () => {
      const pt = await http()
        .get(`/api/cash/vouchers/next-no?type=RECEIPT&voucherDate=${DATE}`)
        .set('Authorization', auth())
        .expect(200)
      expect(pt.body.voucherNo).toBe(`PT0001/${YEAR}`)

      const pc = await http()
        .get(`/api/cash/vouchers/next-no?type=PAYMENT&voucherDate=${DATE}`)
        .set('Authorization', auth())
        .expect(200)
      expect(pc.body.voucherNo).toBe(`PC 0001/${YEAR}`)
    })

    it('thiếu/sai type → 400 (ParseEnumPipe)', async () => {
      await http().get('/api/cash/vouchers/next-no').set('Authorization', auth()).expect(400)
      await http()
        .get('/api/cash/vouchers/next-no?type=SAI')
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('create', () => {
    it('phiếu thu 2 dòng → 201, số phiếu PT0001, totalAmount là chuỗi tổng dòng', async () => {
      const res = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} thu 2 dòng`,
          lines: [
            { debitAccount: '1111', creditAccount: '711', amount: 1500000 },
            { debitAccount: '1111', creditAccount: '131', amount: 500000 },
          ],
        })
        .expect(201)

      expect(res.body.voucherNo).toBe(`PT0001/${YEAR}`)
      expect(res.body.totalAmount).toBe('2000000')
      expect(res.body.postingDate).toBe(DATE)
      // Chứng từ nhập tay mặc định ghi sổ ngay (schema @default(true)).
      expect(res.body.posted).toBe(true)
      expect(res.body.lines).toHaveLength(2)
      expect(res.body.lines[0].lineNo).toBe(1)
      expect(res.body.lines[0].amount).toBe('1500000')
    })

    it('phiếu thu tiếp theo → PT0002 (MAX+1 trong năm)', async () => {
      const res = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} thu tiếp`,
          lines: [{ debitAccount: '1111', creditAccount: '711', amount: 300000 }],
        })
        .expect(201)
      expect(res.body.voucherNo).toBe(`PT0002/${YEAR}`)
    })

    it('phiếu thu bỏ trống TK Nợ → mặc định 1111 (§8.3)', async () => {
      const res = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} mặc định nợ`,
          lines: [{ debitAccount: '', creditAccount: '711', amount: 100000 }],
        })
        .expect(201)
      expect(res.body.lines[0].debitAccount).toBe('1111')
    })

    it('validation: field lạ → 400 (forbidNonWhitelisted); thiếu TK đối ứng → 400 "Dòng 1: thiếu TK Nợ/Có"', async () => {
      await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          fieldLa: true,
          lines: [{ debitAccount: '1111', creditAccount: '711', amount: 100 }],
        })
        .expect(400)

      const res = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} thiếu TK`,
          lines: [{ debitAccount: '1111', creditAccount: '', amount: 100000 }],
        })
        .expect(400)
      expect(res.body.message).toBe('Dòng 1: thiếu TK Nợ/Có')
    })
  })

  describe('list / get / update / posted / delete', () => {
    it('list filter keyword theo tag → chỉ phiếu của spec này, pagination đúng total', async () => {
      const res = await http()
        .get(`/api/cash/vouchers?keyword=${TAG}`)
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3)
      for (const row of res.body.data) {
        expect(row.reason).toContain(TAG)
      }
    })

    it('GET :id trả đủ lines; id lạ → 404 "Không tìm thấy phiếu"', async () => {
      const list = await http()
        .get(`/api/cash/vouchers?keyword=${TAG}`)
        .set('Authorization', auth())
        .expect(200)
      const id = list.body.data[0].id

      const res = await http().get(`/api/cash/vouchers/${id}`).set('Authorization', auth()).expect(200)
      expect(res.body.id).toBe(id)
      expect(res.body.lines.length).toBeGreaterThanOrEqual(1)

      const missing = await http()
        .get('/api/cash/vouchers/00000000-0000-4000-8000-000000000000')
        .set('Authorization', auth())
        .expect(404)
      expect(missing.body.message).toContain('Không tìm thấy phiếu')
    })

    it('update đổi lines → tạo lại toàn bộ dòng + totalAmount tính lại', async () => {
      const created = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} update`,
          lines: [{ debitAccount: '1111', creditAccount: '711', amount: 100000 }],
        })
        .expect(201)
      const oldLineId = created.body.lines[0].id

      const updated = await http()
        .patch(`/api/cash/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({
          lines: [
            { debitAccount: '1111', creditAccount: '711', amount: 250000 },
            { debitAccount: '1111', creditAccount: '131', amount: 750000 },
          ],
        })
        .expect(200)

      expect(updated.body.totalAmount).toBe('1000000')
      expect(updated.body.lines).toHaveLength(2)
      // Line cũ bị xóa tạo lại — id phải đổi.
      expect(updated.body.lines.map((l: { id: string }) => l.id)).not.toContain(oldLineId)
      expect(updated.body.lines.map((l: { lineNo: number }) => l.lineNo)).toEqual([1, 2])
      // voucherNo không đổi sau update.
      expect(updated.body.voucherNo).toBe(created.body.voucherNo)
    })

    it('PATCH :id/posted ghi sổ / bỏ ghi', async () => {
      const created = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'PAYMENT',
          category: 'PAYMENT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} posted`,
          lines: [{ debitAccount: '642', creditAccount: '', amount: 120000 }],
        })
        .expect(201)
      expect(created.body.voucherNo).toMatch(/^PC \d{4}\/2026$/)
      // PAYMENT bỏ trống TK Có → mặc định 1111.
      expect(created.body.lines[0].creditAccount).toBe('1111')

      const posted = await http()
        .patch(`/api/cash/vouchers/${created.body.id}/posted`)
        .set('Authorization', auth())
        .send({ posted: true })
        .expect(200)
      expect(posted.body.posted).toBe(true)

      const unposted = await http()
        .patch(`/api/cash/vouchers/${created.body.id}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(200)
      expect(unposted.body.posted).toBe(false)
    })

    it('delete → GET lại 404', async () => {
      const created = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'RECEIPT',
          category: 'RECEIPT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} delete`,
          lines: [{ debitAccount: '1111', creditAccount: '711', amount: 90000 }],
        })
        .expect(201)

      await http().delete(`/api/cash/vouchers/${created.body.id}`).set('Authorization', auth()).expect(200)
      await http().get(`/api/cash/vouchers/${created.body.id}`).set('Authorization', auth()).expect(404)
    })
  })

  describe('reports (S03a1/S03a2, sổ quỹ, số dư ngày)', () => {
    const RANGE = `fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`

    it('receipt-journal: có PT0001, totalAmount = Σ rows; thiếu fromDate → 400', async () => {
      const res = await http()
        .get(`/api/cash/reports/receipt-journal?${RANGE}`)
        .set('Authorization', auth())
        .expect(200)

      const nos = res.body.rows.map((r: { voucherNo: string }) => r.voucherNo)
      expect(nos).toContain(`PT0001/${YEAR}`)
      const sum = res.body.rows.reduce(
        (s: number, r: { amount: string }) => s + Number(r.amount),
        0,
      )
      expect(Number(res.body.totalAmount)).toBe(sum)
      expect(sum).toBeGreaterThan(0)

      // Kỳ báo cáo bắt buộc cả 2 đầu (IsDateString).
      await http().get('/api/cash/reports/receipt-journal').set('Authorization', auth()).expect(400)
    })

    it('payment-journal: chỉ tính phiếu đã ghi sổ — bỏ ghi thì biến mất', async () => {
      const created = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth())
        .send({
          type: 'PAYMENT',
          category: 'PAYMENT',
          postingDate: DATE,
          voucherDate: DATE,
          reason: `${TAG} chi cho sổ nhật ký`,
          lines: [{ debitAccount: '642', creditAccount: '1111', amount: 200000 }],
        })
        .expect(201)
      expect(created.body.posted).toBe(true)

      const before = await http()
        .get(`/api/cash/reports/payment-journal?${RANGE}`)
        .set('Authorization', auth())
        .expect(200)
      expect(before.body.rows.map((r: { voucherNo: string }) => r.voucherNo)).toContain(
        created.body.voucherNo,
      )

      await http()
        .patch(`/api/cash/vouchers/${created.body.id}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(200)

      const after = await http()
        .get(`/api/cash/reports/payment-journal?${RANGE}`)
        .set('Authorization', auth())
        .expect(200)
      expect(after.body.rows.map((r: { voucherNo: string }) => r.voucherNo)).not.toContain(
        created.body.voucherNo,
      )
    })

    it('cash-book: closing = opening + tổng thu − tổng chi, khớp số dư dòng cuối', async () => {
      const res = await http()
        .get(`/api/cash/reports/cash-book?${RANGE}`)
        .set('Authorization', auth())
        .expect(200)

      const { openingBalance, totalReceipt, totalPayment, closingBalance, rows } = res.body
      expect(Number(closingBalance)).toBe(
        Number(openingBalance) + Number(totalReceipt) - Number(totalPayment),
      )
      expect(rows.length).toBeGreaterThanOrEqual(1)
      expect(rows[rows.length - 1].balance).toBe(closingBalance)
    })

    it('daily-balance: closing = opening + thu − chi, có ngày phát sinh của spec', async () => {
      const res = await http()
        .get(`/api/cash/reports/daily-balance?${RANGE}`)
        .set('Authorization', auth())
        .expect(200)

      const { openingBalance, totalReceipt, totalPayment, closingBalance, rows } = res.body
      expect(Number(closingBalance)).toBe(
        Number(openingBalance) + Number(totalReceipt) - Number(totalPayment),
      )
      expect(rows.map((r: { date: string }) => r.date)).toContain(DATE)
    })
  })
})
