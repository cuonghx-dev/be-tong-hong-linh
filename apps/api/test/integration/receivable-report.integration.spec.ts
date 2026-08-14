import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, clearBookLock, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-RCR'
const YEAR = 2026
const FAKE_ID = '00000000-0000-4000-8000-000000000000'
// Chứng từ quá hạn sâu (hạn 2026-01-10) và trong hạn (hạn 2026-12-31) để tách bucket tuổi nợ.
const OVERDUE = { posting: `${YEAR}-01-05`, due: `${YEAR}-01-10` }
const CURRENT = { posting: `${YEAR}-06-01`, due: `${YEAR}-12-31` }
const AS_OF = `${YEAR}-07-01` // Đến ngày: quá hạn > 90 ngày cho chứng từ OVERDUE

const OVERDUE_CUSTOMER = { code: `${TAG}-KH01`, name: `${TAG} Khách quá hạn` }
const CURRENT_CUSTOMER = { code: `${TAG}-KH02`, name: `${TAG} Khách trong hạn` }

describe('Receivables — báo cáo công nợ, bộ lọc (integration)', () => {
  let app: INestApplication
  let token: string
  let overdueCustomerId: string
  let currentCustomerId: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)

    const http = () => request(app.getHttpServer())
    const auth = `Bearer ${token}`
    const c1 = await http()
      .post('/api/sales/customers')
      .set('Authorization', auth)
      .send(OVERDUE_CUSTOMER)
      .expect(201)
    overdueCustomerId = c1.body.id
    const c2 = await http()
      .post('/api/sales/customers')
      .set('Authorization', auth)
      .send(CURRENT_CUSTOMER)
      .expect(201)
    currentCustomerId = c2.body.id

    const salesVoucher = (
      customer: { code: string; name: string },
      dates: { posting: string; due: string },
      amount: number,
    ) => ({
      voucherType: 'DOMESTIC_GOODS',
      paymentMode: 'UNPAID',
      postingDate: dates.posting,
      voucherDate: dates.posting,
      dueDate: dates.due,
      customerId: customer.code,
      customerName: customer.name,
      description: `${TAG} bán chịu`,
      lines: [{ itemName: 'Hàng công nợ', quantity: 1, unitPrice: amount }],
    })

    await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth)
      .send(salesVoucher(OVERDUE_CUSTOMER, OVERDUE, 2000000))
      .expect(201)
    await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth)
      .send(salesVoucher(CURRENT_CUSTOMER, CURRENT, 3000000))
      .expect(201)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const rowOf = (body: { data: Array<{ customerId: string }> }, customerId: string) =>
    body.data.find((r) => r.customerId === customerId)

  it('không lọc → mỗi KH có Còn phải thu bằng tổng chứng từ chưa thu', async () => {
    const res = await http()
      .get(`/api/sales/receivables?toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const overdue = rowOf(res.body, overdueCustomerId) as
      | { receivableByInvoice: string; remainingReceivable: string }
      | undefined
    expect(overdue?.receivableByInvoice).toBe('2000000')
    expect(overdue?.remainingReceivable).toBe('2000000')
  })

  it('lọc TK công nợ khác 131 → không KH nào có số dư', async () => {
    const res = await http()
      .get(`/api/sales/receivables?account=331&toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    for (const row of res.body.data as Array<{ remainingReceivable: string }>) {
      expect(row.remainingReceivable).toBe('0')
    }
  })

  it('tuổi nợ OVER_90 chỉ giữ KH quá hạn; CURRENT chỉ giữ KH trong hạn', async () => {
    const over90 = await http()
      .get(`/api/sales/receivables?aging=OVER_90&toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const over90Ids = (over90.body.data as Array<{ customerId: string }>).map((r) => r.customerId)
    expect(over90Ids).toContain(overdueCustomerId)
    expect(over90Ids).not.toContain(currentCustomerId)

    const current = await http()
      .get(`/api/sales/receivables?aging=CURRENT&toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const currentIds = (current.body.data as Array<{ customerId: string }>).map((r) => r.customerId)
    expect(currentIds).toContain(currentCustomerId)
    expect(currentIds).not.toContain(overdueCustomerId)
  })

  it('tình trạng nợ: OUTSTANDING giữ KH còn nợ, SETTLED loại họ ra', async () => {
    const outstanding = await http()
      .get(`/api/sales/receivables?status=OUTSTANDING&toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const ids = (outstanding.body.data as Array<{ customerId: string }>).map((r) => r.customerId)
    expect(ids).toEqual(expect.arrayContaining([overdueCustomerId, currentCustomerId]))

    const settled = await http()
      .get(`/api/sales/receivables?status=SETTLED&toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const settledIds = (settled.body.data as Array<{ customerId: string }>).map((r) => r.customerId)
    expect(settledIds).not.toContain(overdueCustomerId)
  })

  it('thu hết công nợ → KH chuyển sang nhóm SETTLED', async () => {
    const open = await http()
      .get(`/api/sales/receivables/open-vouchers?customerId=${overdueCustomerId}`)
      .set('Authorization', auth())
      .expect(200)
    const target = open.body[0] as { salesVoucherId: string }

    await http()
      .post('/api/sales/receivables/collect')
      .set('Authorization', auth())
      .send({
        customerId: overdueCustomerId,
        postingDate: `${YEAR}-06-20`,
        voucherDate: `${YEAR}-06-20`,
        paymentMethod: 'CASH',
        allocations: [{ salesVoucherId: target.salesVoucherId, amount: 2000000 }],
      })
      .expect(201)

    const settled = await http()
      .get(`/api/sales/receivables?status=SETTLED&toDate=${AS_OF}&keyword=${TAG}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const ids = (settled.body.data as Array<{ customerId: string }>).map((r) => r.customerId)
    expect(ids).toContain(overdueCustomerId)
  })

  it('phân trang: pageSize 1 → 1 dòng, total đếm đủ KH khớp keyword', async () => {
    const res = await http()
      .get(`/api/sales/receivables?keyword=${TAG}&page=1&pageSize=1&toDate=${AS_OF}`)
      .set('Authorization', auth())
      .expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2)
  })

  it('collect với khách hàng không tồn tại → 404', async () => {
    await http()
      .post('/api/sales/receivables/collect')
      .set('Authorization', auth())
      .send({
        customerId: FAKE_ID,
        postingDate: `${YEAR}-06-20`,
        voucherDate: `${YEAR}-06-20`,
        paymentMethod: 'CASH',
        allocations: [{ salesVoucherId: FAKE_ID, amount: 1000 }],
      })
      .expect(404)
  })

  it('collect với chứng từ bán không tồn tại → 404', async () => {
    await http()
      .post('/api/sales/receivables/collect')
      .set('Authorization', auth())
      .send({
        customerId: currentCustomerId,
        postingDate: `${YEAR}-06-20`,
        voucherDate: `${YEAR}-06-20`,
        paymentMethod: 'CASH',
        allocations: [{ salesVoucherId: FAKE_ID, amount: 1000 }],
      })
      .expect(404)
  })
})
