import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp, loginAs } from '../helpers/test-app'

describe('Dashboard (integration, smoke)', () => {
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

  const ENDPOINTS = [
    '/api/dashboard/finance',
    '/api/dashboard/finance?period=year',
    '/api/dashboard/receivable-aging',
    '/api/dashboard/payable-aging',
    '/api/dashboard/profit-loss?year=2026',
    '/api/dashboard/cashflow?year=2026',
    '/api/dashboard/inventory?limit=3',
    '/api/dashboard/top-selling?year=2026&limit=3',
    '/api/dashboard/onboarding',
    '/api/dashboard/expenses?year=2026',
  ]

  it.each(ENDPOINTS)('GET %s → 200', async (url) => {
    await http().get(url).set('Authorization', auth()).expect(200)
  })

  it('period ngoài danh sách @IsIn → 400', async () => {
    await http()
      .get('/api/dashboard/finance?period=SAI_GIA_TRI')
      .set('Authorization', auth())
      .expect(400)
  })
})
