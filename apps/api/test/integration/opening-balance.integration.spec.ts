import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp, loginAs } from '../helpers/test-app'

describe('Opening balance (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('GET accounts → có số dư seed (28 dòng betonghonglinh)', async () => {
    const res = await http()
      .get('/api/opening-balance/accounts')
      .set('Authorization', auth())
      .expect(200)
    expect(res.body.length).toBeGreaterThanOrEqual(20)
    const codes = res.body.map((r: { accountCode: string }) => r.accountCode)
    expect(codes).toEqual(expect.arrayContaining(['1111']))
  })

  it('partners: GET/import thiếu accountCode → 400 "Thiếu số tài khoản"; có accountCode → 200', async () => {
    const res = await http()
      .get('/api/opening-balance/partners')
      .set('Authorization', auth())
      .expect(400)
    expect(res.body.message).toBe('Thiếu số tài khoản')

    await http()
      .get('/api/opening-balance/partners?accountCode=131')
      .set('Authorization', auth())
      .expect(200)

    await http()
      .post('/api/opening-balance/partners/import')
      .set('Authorization', auth())
      .expect(400)
  })

  it('bank-accounts: thiếu accountCode → 400; có → 200', async () => {
    await http().get('/api/opening-balance/bank-accounts').set('Authorization', auth()).expect(400)
    await http()
      .get('/api/opening-balance/bank-accounts?accountCode=1121')
      .set('Authorization', auth())
      .expect(200)
  })

  it('PUT fixed-assets thay toàn bộ: ghi 1 dòng → đọc lại đúng → ghi rỗng dọn sạch', async () => {
    const item = {
      code: 'IT-TSCD01',
      name: 'Máy trộn bê tông IT',
      assetType: 'Máy móc thiết bị',
      department: 'Xưởng',
      originalCost: 120000000,
      depreciableValue: 120000000,
      accumulatedDepreciation: 20000000,
      acquisitionDate: '2025-01-01',
      depreciationDate: '2025-01-01',
      usefulLifeMonths: 60,
      remainingMonths: 50,
      assetAccount: '2112',
      depreciationAccount: '2141',
    }

    await http()
      .put('/api/opening-balance/fixed-assets')
      .set('Authorization', auth())
      .send({ items: [item] })
      .expect(200)

    const after = await http()
      .get('/api/opening-balance/fixed-assets')
      .set('Authorization', auth())
      .expect(200)
    expect(after.body).toHaveLength(1)
    expect(after.body[0].code).toBe('IT-TSCD01')

    // PUT là thay toàn bộ (destructive) — gửi rỗng phải dọn sạch.
    await http()
      .put('/api/opening-balance/fixed-assets')
      .set('Authorization', auth())
      .send({ items: [] })
      .expect(200)
    const empty = await http()
      .get('/api/opening-balance/fixed-assets')
      .set('Authorization', auth())
      .expect(200)
    expect(empty.body).toHaveLength(0)
  })
})
