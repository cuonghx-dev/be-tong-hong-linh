import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-INV'
const YEAR = 2026
const DATE = `${YEAR}-03-15`

// Seed betonghonglinh có sẵn hàng hóa BECHUADAU (kho KHO VAT TU, TK kho 153).
const receiptPayload = (overrides: Record<string, unknown> = {}) => ({
  receiptType: 'PURCHASE',
  postingDate: DATE,
  voucherDate: DATE,
  description: `${TAG} nhập kho`,
  lines: [
    {
      itemId: 'BECHUADAU',
      itemName: 'Bể chứa nhiên liệu 15M3',
      warehouseId: 'KHO VAT TU',
      quantity: 3,
      unitPrice: 4000000,
    },
  ],
  ...overrides,
})

const issuePayload = (overrides: Record<string, unknown> = {}) => ({
  category: 'SALES',
  postingDate: DATE,
  voucherDate: DATE,
  description: `${TAG} xuất kho`,
  lines: [
    {
      itemId: 'BECHUADAU',
      itemName: 'Bể chứa nhiên liệu 15M3',
      warehouseId: 'KHO VAT TU',
      quantity: 1,
      unitPrice: 4000000,
    },
  ],
  ...overrides,
})

describe('Inventory (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    // Assert số chứng từ tuyệt đối (NK/XK đầu dãy) → cần bảng trống.
    await cleanVouchers(prismaOf(app))
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('Phiếu nhập kho', () => {
    it('next-no → NK00001 (dãy toàn cục không năm)', async () => {
      const res = await http()
        .get('/api/inventory/receipts/next-no')
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.voucherNo).toBe('NK00001')
    })

    it('create → NK00001, tạo tiếp → NK00002', async () => {
      const first = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send(receiptPayload())
        .expect(201)
      expect(first.body.voucherNo).toBe('NK00001')

      const second = await http()
        .post('/api/inventory/receipts')
        .set('Authorization', auth())
        .send(receiptPayload({ description: `${TAG} nhập kho 2` }))
        .expect(201)
      expect(second.body.voucherNo).toBe('NK00002')
    })

    it('CRUD: get / update / posted / delete', async () => {
      const list = await http()
        .get(`/api/inventory/receipts?keyword=${TAG}`)
        .set('Authorization', auth())
        .expect(200)
      const id = list.body.data[0].id

      await http().get(`/api/inventory/receipts/${id}`).set('Authorization', auth()).expect(200)

      const posted = await http()
        .patch(`/api/inventory/receipts/${id}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(200)
      expect(posted.body.posted).toBe(false)

      await http().delete(`/api/inventory/receipts/${id}`).set('Authorization', auth()).expect(200)
      await http().get(`/api/inventory/receipts/${id}`).set('Authorization', auth()).expect(404)
    })
  })

  describe('Phiếu xuất kho', () => {
    it('create → XK00001/<năm> (5 chữ số + năm)', async () => {
      const res = await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send(issuePayload())
        .expect(201)
      expect(res.body.voucherNo).toBe(`XK00001/${YEAR}`)
    })

    it('book-lock chặn create trong kỳ khóa', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: '2026-03-31' })
        .expect(200)

      await http()
        .post('/api/inventory/issues')
        .set('Authorization', auth())
        .send(issuePayload({ description: `${TAG} bị khóa` }))
        .expect(400)

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })
  })

  describe('Reports', () => {
    it('stock-summary → 200; item-ledger cần itemCode (thiếu → 400)', async () => {
      await http()
        .get(`/api/inventory/reports/stock-summary?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
        .set('Authorization', auth())
        .expect(200)

      await http()
        .get(`/api/inventory/reports/item-ledger?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
        .set('Authorization', auth())
        .expect(400)

      await http()
        .get(
          `/api/inventory/reports/item-ledger?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&itemCode=BECHUADAU`,
        )
        .set('Authorization', auth())
        .expect(200)
    })
  })
})
