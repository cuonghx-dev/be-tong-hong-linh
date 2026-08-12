import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-bank'
const YEAR = 2026
const DATE = `${YEAR}-03-15`
const BANK_ACC = '113366889999' // tham chiếu lỏng — không FK sang danh mục TKNH

const receipt = (overrides: Record<string, unknown> = {}) => ({
  type: 'RECEIPT',
  category: 'RECEIPT',
  postingDate: DATE,
  voucherDate: DATE,
  bankAccountNo: BANK_ACC,
  reason: `${TAG} thu`,
  lines: [{ debitAccount: '1121', creditAccount: '711', amount: 2000000 }],
  ...overrides,
})

describe('Bank vouchers (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    // Assert số chứng từ tuyệt đối (NTTK0001…) → cần bảng trống.
    await cleanVouchers(prismaOf(app))
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('GET next-no', () => {
    it('prefix theo type: NTTK / UNC / CTNB', async () => {
      for (const [type, prefix] of [
        ['RECEIPT', 'NTTK'],
        ['PAYMENT', 'UNC'],
        ['TRANSFER', 'CTNB'],
      ] as const) {
        const res = await http()
          .get(`/api/bank/vouchers/next-no?type=${type}&voucherDate=${DATE}`)
          .set('Authorization', auth())
          .expect(200)
        expect(res.body.voucherNo).toBe(`${prefix}0001/${YEAR}`)
      }
    })

    it('thiếu/sai type → 400', async () => {
      await http().get('/api/bank/vouchers/next-no').set('Authorization', auth()).expect(400)
      await http()
        .get('/api/bank/vouchers/next-no?type=XYZ')
        .set('Authorization', auth())
        .expect(400)
    })
  })

  it('create thu tiền gửi → NTTK0001, totalAmount chuỗi', async () => {
    const res = await http().post('/api/bank/vouchers').set('Authorization', auth()).send(receipt()).expect(201)
    expect(res.body.voucherNo).toBe(`NTTK0001/${YEAR}`)
    expect(res.body.totalAmount).toBe('2000000')
    expect(res.body.bankAccountNo).toBe(BANK_ACC)
  })

  it('create UNC → UNC0001, giữ paymentMethod', async () => {
    const res = await http()
      .post('/api/bank/vouchers')
      .set('Authorization', auth())
      .send(
        receipt({
          type: 'PAYMENT',
          category: 'PAYMENT',
          paymentMethod: 'UNC',
          reason: `${TAG} chi`,
          lines: [{ debitAccount: '642', creditAccount: '1121', amount: 800000 }],
        }),
      )
      .expect(201)
    expect(res.body.voucherNo).toBe(`UNC0001/${YEAR}`)
    expect(res.body.paymentMethod).toBe('UNC')
  })

  describe('CTNB (chuyển tiền nội bộ)', () => {
    it('thiếu tài khoản đến → 400', async () => {
      const res = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(
          receipt({
            type: 'TRANSFER',
            category: 'INTERNAL_TRANSFER',
            reason: `${TAG} ctnb thiếu`,
            lines: [{ debitAccount: '1121', creditAccount: '1121', amount: 1000000 }],
          }),
        )
        .expect(400)
      expect(res.body.message).toBe('Chuyển tiền nội bộ phải chọn tài khoản đến')
    })

    it('đủ 2 đầu tài khoản → CTNB0001, lưu receiverAccountNo', async () => {
      const res = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(
          receipt({
            type: 'TRANSFER',
            category: 'INTERNAL_TRANSFER',
            receiverAccountNo: '999888777666',
            receiverBankName: 'NH đến',
            reason: `${TAG} ctnb`,
            lines: [{ debitAccount: '1121', creditAccount: '1121', amount: 1000000 }],
          }),
        )
        .expect(201)
      expect(res.body.voucherNo).toBe(`CTNB0001/${YEAR}`)
      expect(res.body.receiverAccountNo).toBe('999888777666')
    })
  })

  it('list / get / update / posted / delete', async () => {
    const list = await http()
      .get(`/api/bank/vouchers?keyword=${TAG}`)
      .set('Authorization', auth())
      .expect(200)
    expect(list.body.pagination.total).toBeGreaterThanOrEqual(3)
    const id = list.body.data[0].id

    await http().get(`/api/bank/vouchers/${id}`).set('Authorization', auth()).expect(200)

    const updated = await http()
      .patch(`/api/bank/vouchers/${id}`)
      .set('Authorization', auth())
      .send({ lines: [{ debitAccount: '1121', creditAccount: '711', amount: 3500000 }] })
      .expect(200)
    expect(updated.body.totalAmount).toBe('3500000')

    const posted = await http()
      .patch(`/api/bank/vouchers/${id}/posted`)
      .set('Authorization', auth())
      .send({ posted: false })
      .expect(200)
    expect(posted.body.posted).toBe(false)

    await http().delete(`/api/bank/vouchers/${id}`).set('Authorization', auth()).expect(200)
    await http().get(`/api/bank/vouchers/${id}`).set('Authorization', auth()).expect(404)
  })

  it('reports smoke: bank-book + account-balances + daily-balance', async () => {
    await http()
      .get(`/api/bank/reports/bank-book?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
    await http()
      .get(`/api/bank/reports/account-balances?toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
    await http()
      .get(`/api/bank/reports/daily-balance?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
  })
})
