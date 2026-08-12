import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-CAT'

describe('Catalog (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    await prismaOf(app).account.deleteMany({ where: { name: { startsWith: TAG } } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('accounts — CRUD đại diện', () => {
    it('GET list trả danh mục seed (hệ thống TK TT133)', async () => {
      const res = await http().get('/api/catalog/accounts').set('Authorization', auth()).expect(200)
      const rows = Array.isArray(res.body) ? res.body : res.body.data
      expect(rows.length).toBeGreaterThan(100)
    })

    it('POST tạo → GET :id → PATCH → DELETE', async () => {
      const created = await http()
        .post('/api/catalog/accounts')
        .set('Authorization', auth())
        .send({ number: '99991', name: `${TAG} TK kiểm thử`, nature: 'DEBIT' })
        .expect(201)
      expect(created.body.number).toBe('99991')

      const got = await http()
        .get(`/api/catalog/accounts/${created.body.id}`)
        .set('Authorization', auth())
        .expect(200)
      expect(got.body.name).toBe(`${TAG} TK kiểm thử`)

      const updated = await http()
        .patch(`/api/catalog/accounts/${created.body.id}`)
        .set('Authorization', auth())
        .send({ name: `${TAG} TK đã sửa` })
        .expect(200)
      expect(updated.body.name).toBe(`${TAG} TK đã sửa`)

      await http()
        .delete(`/api/catalog/accounts/${created.body.id}`)
        .set('Authorization', auth())
        .expect(200)
    })

    it('validation: thiếu số tài khoản → 400', async () => {
      await http()
        .post('/api/catalog/accounts')
        .set('Authorization', auth())
        .send({ name: 'Thiếu số', nature: 'DEBIT' })
        .expect(400)
    })
  })

  describe('import xlsx', () => {
    it('import lại chính fixture seed đơn vị tính → idempotent (created 0, skipped > 0)', async () => {
      const fixture = readFileSync(
        path.resolve(
          __dirname,
          '../../prisma/initial-databases/betonghonglinh/data/Danh_sach_don_vi_tinh.xlsx',
        ),
      )
      const res = await http()
        .post('/api/catalog/units/import')
        .set('Authorization', auth())
        .attach('file', fixture, 'Danh_sach_don_vi_tinh.xlsx')
        .expect(201)
      expect(res.body.created).toBe(0)
      expect(res.body.skipped).toBeGreaterThan(0)
    })

    it('không đính kèm file → 400 "Thiếu file Excel"', async () => {
      const res = await http()
        .post('/api/catalog/units/import')
        .set('Authorization', auth())
        .expect(400)
      expect(res.body.message).toBe('Thiếu file Excel')
    })
  })

  it('smoke GET các danh mục seed khác: kho + hàng hóa', async () => {
    const warehouses = await http()
      .get('/api/catalog/warehouses')
      .set('Authorization', auth())
      .expect(200)
    const whRows = Array.isArray(warehouses.body) ? warehouses.body : warehouses.body.data
    expect(whRows.map((w: { code: string }) => w.code)).toEqual(
      expect.arrayContaining(['KHO VAT TU']),
    )

    const products = await http()
      .get('/api/catalog/products?keyword=BECHUADAU')
      .set('Authorization', auth())
      .expect(200)
    const pRows = Array.isArray(products.body) ? products.body : products.body.data
    expect(pRows.length).toBeGreaterThanOrEqual(1)
  })
})
