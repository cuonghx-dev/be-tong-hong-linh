import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const YEAR = 2026
const DATE = `${YEAR}-03-15`
const RANGE = `fromDate=${YEAR}-03-01&toDate=${YEAR}-03-31`

describe('Reports — sổ nhật ký chung + sổ chi tiết TK (integration)', () => {
  let app: INestApplication
  let token: string
  let voucherNo: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))

    // 1 phiếu thu posted trong kỳ → phải xuất hiện trên cả 2 sổ.
    const res = await request(app.getHttpServer())
      .post('/api/cash/vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'RECEIPT',
        category: 'RECEIPT',
        postingDate: DATE,
        voucherDate: DATE,
        reason: 'IT-report thu tiền',
        lines: [{ debitAccount: '1111', creditAccount: '711', amount: 999000 }],
      })
      .expect(201)
    voucherNo = res.body.voucherNo
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('thiếu fromDate/toDate → 400', async () => {
    await http().get('/api/reports/general-journal').set('Authorization', auth()).expect(400)
    await http()
      .get(`/api/reports/general-journal?fromDate=${YEAR}-03-01`)
      .set('Authorization', auth())
      .expect(400)
  })

  it('general-journal chứa bút toán Nợ 1111 / Có 711 đúng số tiền (chuỗi)', async () => {
    const res = await http()
      .get(`/api/reports/general-journal?${RANGE}`)
      .set('Authorization', auth())
      .expect(200)

    const voucher = res.body.vouchers.find(
      (v: { voucherNo: string }) => v.voucherNo === voucherNo,
    )
    expect(voucher).toBeDefined()
    // 1 bút toán = 2 dòng liền nhau: vế Nợ rồi vế Có.
    type Row = { account: string; debitAmount: string; creditAmount: string }
    const debitRow = voucher.rows.find((r: Row) => r.account === '1111')
    const creditRow = voucher.rows.find((r: Row) => r.account === '711')
    // Sổ dùng raw SQL ::text nên giữ scale NUMERIC(18,2) → '999000.00'.
    expect(debitRow?.debitAmount).toBe('999000.00')
    expect(creditRow?.creditAmount).toBe('999000.00')
    expect(res.body.totalDebit).toBe(res.body.totalCredit)
  })

  it('chứng từ bỏ ghi biến mất khỏi sổ', async () => {
    const list = await http()
      .get('/api/cash/vouchers?keyword=IT-report')
      .set('Authorization', auth())
      .expect(200)
    const id = list.body.data[0].id

    await http()
      .patch(`/api/cash/vouchers/${id}/posted`)
      .set('Authorization', auth())
      .send({ posted: false })
      .expect(200)

    const res = await http()
      .get(`/api/reports/general-journal?${RANGE}`)
      .set('Authorization', auth())
      .expect(200)
    const found = res.body.vouchers.find((v: { voucherNo: string }) => v.voucherNo === voucherNo)
    expect(found).toBeUndefined()

    await http()
      .patch(`/api/cash/vouchers/${id}/posted`)
      .set('Authorization', auth())
      .send({ posted: true })
      .expect(200)
  })

  it('account-ledger lọc theo prefix TK → có phát sinh TK 1111', async () => {
    const res = await http()
      .get(`/api/reports/account-ledger?${RANGE}&accountCode=1111`)
      .set('Authorization', auth())
      .expect(200)
    const body = JSON.stringify(res.body)
    expect(body).toContain('1111')
    expect(body).toContain('999000')
  })
})
