import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf, type TestRole } from '../helpers/test-app'

const FORBIDDEN_MSG = 'Bạn không có quyền thực hiện thao tác này'

// Payload phiếu thu tối thiểu để test quyền write/post trên domain cash.
const receiptPayload = (tag: string) => ({
  type: 'RECEIPT',
  category: 'RECEIPT',
  postingDate: '2026-03-15',
  voucherDate: '2026-03-15',
  reason: `IT-permissions ${tag}`,
  lines: [{ debitAccount: '1111', creditAccount: '711', amount: 100000 }],
})

describe('Permissions matrix (integration)', () => {
  let app: INestApplication
  const tokens = {} as Record<TestRole, string>

  beforeAll(async () => {
    app = await createTestApp()
    for (const role of ['admin', 'ketoan', 'thuquy', 'viewer'] as const) {
      tokens[role] = await loginAs(app, role)
    }
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = (role: TestRole) => `Bearer ${tokens[role]}`

  describe('VIEWER — chỉ đọc', () => {
    it('GET cash → 200', async () => {
      await http().get('/api/cash/vouchers').set('Authorization', auth('viewer')).expect(200)
    })

    it('POST cash → 403 kèm message tiếng Việt', async () => {
      const res = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth('viewer'))
        .send(receiptPayload('viewer'))
        .expect(403)
      expect(res.body.message).toBe(FORBIDDEN_MSG)
    })
  })

  describe('THUQUY — read + post cash/bank/inventory, không write', () => {
    it('POST cash (write) → 403', async () => {
      await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth('thuquy'))
        .send(receiptPayload('thuquy'))
        .expect(403)
    })

    it('PATCH :id/posted (@Action post) → 200', async () => {
      const created = await http()
        .post('/api/cash/vouchers')
        .set('Authorization', auth('admin'))
        .send(receiptPayload('thuquy-post'))
        .expect(201)

      const res = await http()
        .patch(`/api/cash/vouchers/${created.body.id}/posted`)
        .set('Authorization', auth('thuquy'))
        .send({ posted: true })
        .expect(200)
      expect(res.body.posted).toBe(true)
    })

    it('GET catalog/report/dashboard → 200, POST catalog → 403', async () => {
      await http().get('/api/catalog/accounts').set('Authorization', auth('thuquy')).expect(200)
      await http()
        .get('/api/reports/general-journal?fromDate=2026-01-01&toDate=2026-12-31')
        .set('Authorization', auth('thuquy'))
        .expect(200)
      await http().get('/api/dashboard/finance').set('Authorization', auth('thuquy')).expect(200)
      await http()
        .post('/api/catalog/accounts')
        .set('Authorization', auth('thuquy'))
        .send({ number: '9999', name: 'TK test', nature: 'DEBIT' })
        .expect(403)
    })
  })

  describe('Domain users — chỉ ADMIN', () => {
    it('KETOAN GET /users → 403', async () => {
      await http().get('/api/users').set('Authorization', auth('ketoan')).expect(403)
    })

    it('ADMIN GET /users → 200', async () => {
      const res = await http().get('/api/users').set('Authorization', auth('admin')).expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  it('KETOAN ghi được nghiệp vụ (POST cash → 201)', async () => {
    await http()
      .post('/api/cash/vouchers')
      .set('Authorization', auth('ketoan'))
      .send(receiptPayload('ketoan'))
      .expect(201)
  })
})
