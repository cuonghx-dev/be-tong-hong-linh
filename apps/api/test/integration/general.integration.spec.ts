import type { INestApplication } from '@nestjs/common'
import * as XLSX from 'xlsx'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-NVK'
const YEAR = 2026
const DATE = `${YEAR}-03-15`

const nvkPayload = (overrides: Record<string, unknown> = {}) => ({
  postingDate: DATE,
  voucherDate: DATE,
  description: `${TAG} nghiệp vụ khác`,
  lines: [{ debitAccount: '632', creditAccount: '154', amount: 1200000 }],
  ...overrides,
})

describe('General vouchers — NVK (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
  })

  afterAll(async () => {
    await cleanVouchers(prismaOf(app))
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('create → NVK1/<năm> (không zero-pad), tạo tiếp NVK2', async () => {
    const first = await http()
      .post('/api/general/vouchers')
      .set('Authorization', auth())
      .send(nvkPayload())
      .expect(201)
    expect(first.body.voucherNo).toBe(`NVK1/${YEAR}`)
    expect(first.body.totalAmount).toBe('1200000')

    const second = await http()
      .post('/api/general/vouchers')
      .set('Authorization', auth())
      .send(nvkPayload({ description: `${TAG} tiếp` }))
      .expect(201)
    expect(second.body.voucherNo).toBe(`NVK2/${YEAR}`)
  })

  it('line thiếu TK Nợ/Có → 400 message rõ ràng', async () => {
    const res = await http()
      .post('/api/general/vouchers')
      .set('Authorization', auth())
      .send(nvkPayload({ lines: [{ debitAccount: '', creditAccount: '154', amount: 100 }] }))
      .expect(400)
    expect(JSON.stringify(res.body.message)).toContain('TK Nợ không được để trống')
  })

  it('import xlsx: bỏ qua số chứng từ trùng (trong DB lẫn trong file)', async () => {
    // Header đúng như parser NVK mong đợi (cột tiếng Việt).
    const rows = [
      ['Ngày hạch toán', 'Ngày chứng từ', 'Số chứng từ', 'Diễn giải', 'Số tiền'],
      [DATE, DATE, `NVK900/${YEAR}`, `${TAG} import 1`, 500000],
      [DATE, DATE, `NVK900/${YEAR}`, `${TAG} import trùng file`, 500000],
      [DATE, DATE, `NVK901/${YEAR}`, `${TAG} import 2`, 800000],
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const first = await http()
      .post('/api/general/vouchers/import')
      .set('Authorization', auth())
      .attach('file', buffer, 'nvk-import.xlsx')
      .expect(201)
    expect(first.body.created).toBe(2)
    expect(first.body.skipped).toBe(1)

    // Import lại chính file đó → toàn bộ bị bỏ qua (idempotent).
    const again = await http()
      .post('/api/general/vouchers/import')
      .set('Authorization', auth())
      .attach('file', buffer, 'nvk-import.xlsx')
      .expect(201)
    expect(again.body.created).toBe(0)
    expect(again.body.skipped).toBe(3)
  })

  it('không đính kèm file → 400 "Thiếu file Excel"', async () => {
    const res = await http()
      .post('/api/general/vouchers/import')
      .set('Authorization', auth())
      .expect(400)
    expect(res.body.message).toBe('Thiếu file Excel')
  })

  it('CRUD: update lines tính lại tổng, posted, delete', async () => {
    const created = await http()
      .post('/api/general/vouchers')
      .set('Authorization', auth())
      .send(nvkPayload({ description: `${TAG} crud` }))
      .expect(201)

    const updated = await http()
      .patch(`/api/general/vouchers/${created.body.id}`)
      .set('Authorization', auth())
      .send({
        lines: [
          { debitAccount: '632', creditAccount: '154', amount: 400000 },
          { debitAccount: '811', creditAccount: '331', amount: 600000 },
        ],
      })
      .expect(200)
    expect(updated.body.totalAmount).toBe('1000000')
    expect(updated.body.lines).toHaveLength(2)

    await http()
      .patch(`/api/general/vouchers/${created.body.id}/posted`)
      .set('Authorization', auth())
      .send({ posted: false })
      .expect(200)

    await http()
      .delete(`/api/general/vouchers/${created.body.id}`)
      .set('Authorization', auth())
      .expect(200)
    await http().get(`/api/general/vouchers/${created.body.id}`).set('Authorization', auth()).expect(404)
  })
})
