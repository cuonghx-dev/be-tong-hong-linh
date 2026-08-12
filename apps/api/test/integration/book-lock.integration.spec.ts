import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, clearBookLock } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const receiptPayload = (postingDate: string) => ({
  type: 'RECEIPT',
  category: 'RECEIPT',
  postingDate,
  voucherDate: postingDate,
  reason: 'IT-book-lock',
  lines: [{ debitAccount: '1111', creditAccount: '711', amount: 50000 }],
})

describe('Book lock (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterEach(async () => {
    // Khóa sổ là state toàn cục — luôn dọn để không lây sang test/spec sau.
    await clearBookLock(prismaOf(app))
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('GET khi chưa khóa → lockDate null', async () => {
    const res = await http().get('/api/book-lock').set('Authorization', auth()).expect(200)
    expect(res.body.lockDate).toBeNull()
  })

  it('PUT đặt ngày khóa → GET trả đúng ngày; DELETE → null', async () => {
    const put = await http()
      .put('/api/book-lock')
      .set('Authorization', auth())
      .send({ lockDate: '2026-03-31' })
      .expect(200)
    expect(put.body.lockDate).toBe('2026-03-31')

    const get = await http().get('/api/book-lock').set('Authorization', auth()).expect(200)
    expect(get.body.lockDate).toBe('2026-03-31')

    const del = await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    expect(del.body.lockDate).toBeNull()
  })

  it('chặn tạo chứng từ có ngày hạch toán ≤ ngày khóa (inclusive), sau ngày khóa thì cho', async () => {
    await http()
      .put('/api/book-lock')
      .set('Authorization', auth())
      .send({ lockDate: '2026-03-31' })
      .expect(200)

    // Trước ngày khóa → chặn.
    const before = await http()
      .post('/api/cash/vouchers')
      .set('Authorization', auth())
      .send(receiptPayload('2026-03-15'))
      .expect(400)
    expect(before.body.message).toContain('Đã khóa sổ đến ngày 31/03/2026')

    // Đúng ngày khóa → vẫn chặn (so sánh ≤).
    await http()
      .post('/api/cash/vouchers')
      .set('Authorization', auth())
      .send(receiptPayload('2026-03-31'))
      .expect(400)

    // Sau ngày khóa → tạo được.
    await http()
      .post('/api/cash/vouchers')
      .set('Authorization', auth())
      .send(receiptPayload('2026-04-01'))
      .expect(201)
  })

  it('chặn sửa/xóa chứng từ nằm trong kỳ đã khóa', async () => {
    const created = await http()
      .post('/api/cash/vouchers')
      .set('Authorization', auth())
      .send(receiptPayload('2026-05-10'))
      .expect(201)

    await http()
      .put('/api/book-lock')
      .set('Authorization', auth())
      .send({ lockDate: '2026-05-31' })
      .expect(200)

    await http()
      .patch(`/api/cash/vouchers/${created.body.id}`)
      .set('Authorization', auth())
      .send({ reason: 'sửa trong kỳ khóa' })
      .expect(400)

    await http().delete(`/api/cash/vouchers/${created.body.id}`).set('Authorization', auth()).expect(400)

    // Mở khóa → xóa được.
    await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    await http().delete(`/api/cash/vouchers/${created.body.id}`).set('Authorization', auth()).expect(200)
  })
})
