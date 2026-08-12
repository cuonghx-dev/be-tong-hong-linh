import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-SAL'
const YEAR = 2026
const DATE = `${YEAR}-03-15`
const CUSTOMER = { code: `${TAG}-KH01`, name: 'Khách Hàng Tích Hợp' }

const salesVoucher = (paymentMode: string, overrides: Record<string, unknown> = {}) => ({
  voucherType: 'DOMESTIC_GOODS',
  paymentMode,
  postingDate: DATE,
  voucherDate: DATE,
  customerId: CUSTOMER.code, // gửi MÃ — service tự tra row id
  customerName: CUSTOMER.name,
  description: `${TAG} bán hàng`,
  lines: [{ itemName: 'Hàng test', quantity: 10, unitPrice: 150000 }],
  ...overrides,
})

describe('Sales vouchers (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await request(app.getHttpServer())
      .post('/api/sales/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(CUSTOMER)
      .expect(201)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('UNPAID → BH0001/<năm>, chưa sinh phiếu thu', async () => {
    const res = await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth())
      .send(salesVoucher('UNPAID'))
      .expect(201)
    expect(res.body.voucherNo).toBe(`BH0001/${YEAR}`)
    expect(res.body.receiptId).toBeNull()
    // 10 × 150000
    expect(res.body.totalPayment ?? res.body.totalAmount).toBeDefined()
  })

  it('PAID_NOW → số PT chung với phiếu thu tự sinh (SALES_CASH)', async () => {
    const res = await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth())
      .send(salesVoucher('PAID_NOW', { description: `${TAG} thu ngay` }))
      .expect(201)

    expect(res.body.voucherNo).toMatch(/^PT\d{4}\/2026$/)
    expect(res.body.receiptId).not.toBeNull()

    const pt = await prismaOf(app).cashVoucher.findUnique({ where: { id: res.body.receiptId } })
    expect(pt).not.toBeNull()
    expect(pt!.voucherNo).toBe(res.body.voucherNo)
    expect(pt!.category).toBe('SALES_CASH')
  })

  it('isInventoryIssue → phiếu xuất kho tự sinh (issueId)', async () => {
    const res = await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth())
      .send(
        salesVoucher('UNPAID', {
          isInventoryIssue: true,
          description: `${TAG} kèm xuất kho`,
          lines: [
            {
              itemId: 'BECHUADAU',
              itemName: 'Bể chứa nhiên liệu 15M3',
              warehouseId: 'KHO VAT TU',
              quantity: 1,
              unitPrice: 8000000,
            },
          ],
        }),
      )
      .expect(201)

    expect(res.body.issueId).not.toBeNull()
    const issue = await prismaOf(app).goodsIssueVoucher.findUnique({
      where: { id: res.body.issueId },
    })
    expect(issue).not.toBeNull()
    expect(issue!.voucherNo).toMatch(/^XK\d{5}\/2026$/)
  })

  it('update bỏ isInventoryIssue → phiếu xuất bị xóa', async () => {
    const created = await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth())
      .send(
        salesVoucher('UNPAID', {
          isInventoryIssue: true,
          description: `${TAG} bỏ xuất kho`,
        }),
      )
      .expect(201)
    const issueId = created.body.issueId
    expect(issueId).not.toBeNull()

    const updated = await http()
      .patch(`/api/sales/vouchers/${created.body.id}`)
      .set('Authorization', auth())
      .send({ isInventoryIssue: false })
      .expect(200)
    expect(updated.body.issueId).toBeNull()

    const issue = await prismaOf(app).goodsIssueVoucher.findUnique({ where: { id: issueId } })
    expect(issue).toBeNull()
  })

  it('next-no theo paymentMode: UNPAID → BH, PAID_NOW → PT', async () => {
    const bh = await http()
      .get(`/api/sales/vouchers/next-no?voucherDate=${DATE}&paymentMode=UNPAID`)
      .set('Authorization', auth())
      .expect(200)
    expect(bh.body.voucherNo).toMatch(/^BH\d{4}\/2026$/)

    const pt = await http()
      .get(`/api/sales/vouchers/next-no?voucherDate=${DATE}&paymentMode=PAID_NOW`)
      .set('Authorization', auth())
      .expect(200)
    expect(pt.body.voucherNo).toMatch(/^PT\d{4}\/2026$/)
  })

  it('list keyword + get + delete', async () => {
    const list = await http()
      .get(`/api/sales/vouchers?keyword=${encodeURIComponent(CUSTOMER.name)}`)
      .set('Authorization', auth())
      .expect(200)
    expect(list.body.pagination.total).toBeGreaterThanOrEqual(3)

    const id = list.body.data[0].id
    await http().get(`/api/sales/vouchers/${id}`).set('Authorization', auth()).expect(200)

    await http().delete(`/api/sales/vouchers/${id}`).set('Authorization', auth()).expect(200)
    await http().get(`/api/sales/vouchers/${id}`).set('Authorization', auth()).expect(404)
  })

  it('reports smoke: detail + by-item + receivable-summary + receivable-detail', async () => {
    await http()
      .get(`/api/sales/reports/detail?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
    await http()
      .get(`/api/sales/reports/by-item?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
    await http()
      .get(`/api/sales/reports/receivable-summary?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
    await http()
      .get(`/api/sales/reports/receivable-detail?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
  })
})
