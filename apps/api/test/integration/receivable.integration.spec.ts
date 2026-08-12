import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-REC'
const YEAR = 2026
const DATE = `${YEAR}-03-15`
const CUSTOMER = { code: `${TAG}-KH01`, name: 'Khách Công Nợ' }
const OTHER_CUSTOMER = { code: `${TAG}-KH02`, name: 'Khách Khác' }

describe('Receivables — thu tiền đối trừ (integration)', () => {
  let app: INestApplication
  let token: string
  let customerId: string
  let otherCustomerId: string
  let voucherId: string // chứng từ BH posted, tổng 1_500_000

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))

    const c1 = await request(app.getHttpServer())
      .post('/api/sales/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(CUSTOMER)
      .expect(201)
    customerId = c1.body.id
    const c2 = await request(app.getHttpServer())
      .post('/api/sales/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(OTHER_CUSTOMER)
      .expect(201)
    otherCustomerId = c2.body.id

    const v = await request(app.getHttpServer())
      .post('/api/sales/vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        voucherType: 'DOMESTIC_GOODS',
        paymentMode: 'UNPAID',
        postingDate: DATE,
        voucherDate: DATE,
        customerId: CUSTOMER.code,
        customerName: CUSTOMER.name,
        description: `${TAG} bán chịu`,
        lines: [{ itemName: 'Hàng công nợ', quantity: 1, unitPrice: 1500000 }],
      })
      .expect(201)
    voucherId = v.body.id
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const collectPayload = (overrides: Record<string, unknown> = {}) => ({
    customerId,
    postingDate: DATE,
    voucherDate: DATE,
    paymentMethod: 'CASH',
    allocations: [{ salesVoucherId: voucherId, amount: 500000 }],
    ...overrides,
  })

  it('GET open-vouchers → chứa chứng từ còn công nợ', async () => {
    const res = await http()
      .get(`/api/sales/receivables/open-vouchers?customerId=${customerId}`)
      .set('Authorization', auth())
      .expect(200)
    const ids = res.body.map((r: { salesVoucherId: string }) => r.salesVoucherId)
    expect(ids).toContain(voucherId)
  })

  describe('collect — lỗi 400', () => {
    it('chuyển khoản thiếu bankAccountNo', async () => {
      const res = await http()
        .post('/api/sales/receivables/collect')
        .set('Authorization', auth())
        .send(collectPayload({ paymentMethod: 'BANK_TRANSFER' }))
        .expect(400)
      expect(res.body.message).toBe('Thu tiền chuyển khoản phải chọn tài khoản ngân hàng nhận')
    })

    it('trùng chứng từ trong danh sách đối trừ', async () => {
      const res = await http()
        .post('/api/sales/receivables/collect')
        .set('Authorization', auth())
        .send(
          collectPayload({
            allocations: [
              { salesVoucherId: voucherId, amount: 100000 },
              { salesVoucherId: voucherId, amount: 100000 },
            ],
          }),
        )
        .expect(400)
      expect(res.body.message).toBe('Trùng chứng từ trong danh sách đối trừ')
    })

    it('chứng từ không thuộc khách hàng đã chọn', async () => {
      const res = await http()
        .post('/api/sales/receivables/collect')
        .set('Authorization', auth())
        .send(collectPayload({ customerId: otherCustomerId }))
        .expect(400)
      expect(res.body.message).toContain('không thuộc khách hàng đã chọn')
    })

    it('thu vượt số còn phải thu', async () => {
      const res = await http()
        .post('/api/sales/receivables/collect')
        .set('Authorization', auth())
        .send(collectPayload({ allocations: [{ salesVoucherId: voucherId, amount: 99000000 }] }))
        .expect(400)
      expect(res.body.message).toContain('vượt số còn phải thu')
    })

    it('chứng từ bỏ ghi → không còn công nợ để đối trừ', async () => {
      await http()
        .patch(`/api/sales/vouchers/${voucherId}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(200)

      const res = await http()
        .post('/api/sales/receivables/collect')
        .set('Authorization', auth())
        .send(collectPayload())
        .expect(400)
      expect(res.body.message).toContain('không còn công nợ để đối trừ')

      await http()
        .patch(`/api/sales/vouchers/${voucherId}/posted`)
        .set('Authorization', auth())
        .send({ posted: true })
        .expect(200)
    })
  })

  it('collect tiền mặt → PT posted + allocation, thu nốt phần còn lại xong thì hết công nợ', async () => {
    const first = await http()
      .post('/api/sales/receivables/collect')
      .set('Authorization', auth())
      .send(collectPayload())
      .expect(201)
    expect(first.body.voucherNo).toMatch(/^PT\d{4}\/2026$/)
    expect(first.body.totalAmount).toBe('500000')

    const pt = await prismaOf(app).cashVoucher.findUnique({ where: { id: first.body.voucherId } })
    expect(pt).not.toBeNull()
    expect(pt!.posted).toBe(true)

    const allocs = await prismaOf(app).paymentAllocation.findMany({
      where: { salesVoucherId: voucherId },
    })
    expect(allocs).toHaveLength(1)
    expect(allocs[0]?.cashVoucherId).toBe(first.body.voucherId)

    // Thu nốt 1 triệu còn lại → chứng từ biến mất khỏi open-vouchers.
    await http()
      .post('/api/sales/receivables/collect')
      .set('Authorization', auth())
      .send(collectPayload({ allocations: [{ salesVoucherId: voucherId, amount: 1000000 }] }))
      .expect(201)

    const open = await http()
      .get(`/api/sales/receivables/open-vouchers?customerId=${customerId}`)
      .set('Authorization', auth())
      .expect(200)
    expect(open.body.map((r: { salesVoucherId: string }) => r.salesVoucherId)).not.toContain(voucherId)
  })

  it('collect chuyển khoản → sinh chứng từ NTTK bên bank', async () => {
    const v = await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth())
      .send({
        voucherType: 'DOMESTIC_GOODS',
        paymentMode: 'UNPAID',
        postingDate: DATE,
        voucherDate: DATE,
        customerId: CUSTOMER.code,
        customerName: CUSTOMER.name,
        description: `${TAG} bán chịu CK`,
        lines: [{ itemName: 'Hàng CK', quantity: 1, unitPrice: 700000 }],
      })
      .expect(201)

    const res = await http()
      .post('/api/sales/receivables/collect')
      .set('Authorization', auth())
      .send(
        collectPayload({
          paymentMethod: 'BANK_TRANSFER',
          bankAccountNo: '113366889999',
          allocations: [{ salesVoucherId: v.body.id, amount: 700000 }],
        }),
      )
      .expect(201)
    expect(res.body.voucherNo).toMatch(/^NTTK\d{4}\/2026$/)

    const bankVoucher = await prismaOf(app).bankVoucher.findUnique({
      where: { id: res.body.voucherId },
    })
    expect(bankVoucher).not.toBeNull()
    expect(bankVoucher!.posted).toBe(true)
  })

  it('GET /api/sales/receivables (báo cáo công nợ) → 200', async () => {
    await http().get('/api/sales/receivables').set('Authorization', auth()).expect(200)
  })
})
