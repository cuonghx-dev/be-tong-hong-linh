import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  cleanVouchers,
  clearBookLock,
  deleteCustomersByPrefix,
  deleteSuppliersByPrefix,
} from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-CLK'
const YEAR = 2026
const DATE = `${YEAR}-06-08`
const FAKE_ID = '00000000-0000-4000-8000-000000000000'
const CUSTOMER = { code: `${TAG}-KH01`, name: `${TAG} Khách hàng liên kết` }
const SUPPLIER = { code: `${TAG}-NCC01`, name: `${TAG} NCC liên kết`, type: 'ORG' }

// PT/PC tự sinh phải chỉ ngược về chứng từ bán/mua nguồn (salesVoucherId /
// purchaseVoucherId) để FE mở đúng form; phiếu nhập tay thì 2 trường này null.
describe('Cash — liên kết chứng từ nguồn + bộ lọc (integration)', () => {
  let app: INestApplication
  let token: string
  let salesId: string
  let salesReceiptId: string
  let purchaseId: string
  let purchasePaymentId: string
  let manualId: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)

    const http = () => request(app.getHttpServer())
    const auth = `Bearer ${token}`
    await http().post('/api/sales/customers').set('Authorization', auth).send(CUSTOMER).expect(201)
    await http()
      .post('/api/purchase/suppliers')
      .set('Authorization', auth)
      .send(SUPPLIER)
      .expect(201)

    // Bán hàng thu ngay tiền mặt → PT tự sinh (SALES_CASH).
    const sales = await http()
      .post('/api/sales/vouchers')
      .set('Authorization', auth)
      .send({
        voucherType: 'DOMESTIC_GOODS',
        paymentMode: 'PAID_NOW',
        postingDate: DATE,
        voucherDate: DATE,
        customerId: CUSTOMER.code,
        customerName: CUSTOMER.name,
        description: `${TAG} bán thu ngay`,
        lines: [{ itemName: 'Hàng thu ngay', quantity: 1, unitPrice: 1200000 }],
      })
      .expect(201)
    salesId = sales.body.id
    salesReceiptId = sales.body.receiptId

    // Mua dịch vụ trả ngay tiền mặt → PC tự sinh (PURCHASE_SERVICE_CASH).
    const purchase = await http()
      .post('/api/purchase/vouchers')
      .set('Authorization', auth)
      .send({
        type: 'SERVICE',
        paymentMode: 'IMMEDIATE',
        postingDate: DATE,
        voucherDate: DATE,
        supplierId: SUPPLIER.code,
        supplierName: SUPPLIER.name,
        description: `${TAG} mua trả ngay`,
        lines: [{ itemName: 'Dịch vụ trả ngay', quantity: 1, unitPrice: 800000 }],
      })
      .expect(201)
    purchaseId = purchase.body.id
    purchasePaymentId = purchase.body.paymentId

    // Phiếu thu nhập tay — không liên kết chứng từ nào.
    const manual = await http()
      .post('/api/cash/vouchers')
      .set('Authorization', auth)
      .send({
        type: 'RECEIPT',
        category: 'RECEIPT',
        postingDate: DATE,
        voucherDate: DATE,
        partnerName: 'Khách lẻ',
        reason: `${TAG} thu khác`,
        lines: [{ description: 'Thu khác', debitAccount: '1111', creditAccount: '711', amount: 300000 }],
      })
      .expect(201)
    manualId = manual.body.id
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('GET :id của PT tự sinh → salesVoucherId trỏ về chứng từ bán hàng', async () => {
    const res = await http()
      .get(`/api/cash/vouchers/${salesReceiptId}`)
      .set('Authorization', auth())
      .expect(200)
    expect(res.body.category).toBe('SALES_CASH')
    expect(res.body.salesVoucherId).toBe(salesId)
    expect(res.body.purchaseVoucherId).toBeNull()
  })

  it('GET :id của PC tự sinh → purchaseVoucherId + purchaseVoucherType', async () => {
    const res = await http()
      .get(`/api/cash/vouchers/${purchasePaymentId}`)
      .set('Authorization', auth())
      .expect(200)
    expect(res.body.category).toBe('PURCHASE_SERVICE_CASH')
    expect(res.body.purchaseVoucherId).toBe(purchaseId)
    expect(res.body.purchaseVoucherType).toBe('SERVICE')
    expect(res.body.salesVoucherId).toBeNull()
  })

  it('GET :id phiếu nhập tay → cả 2 liên kết đều null', async () => {
    const res = await http()
      .get(`/api/cash/vouchers/${manualId}`)
      .set('Authorization', auth())
      .expect(200)
    expect(res.body.salesVoucherId).toBeNull()
    expect(res.body.purchaseVoucherId).toBeNull()
  })

  it('GET danh sách cũng kèm liên kết cho từng dòng', async () => {
    const res = await http()
      .get(`/api/cash/vouchers?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    const rows = res.body.data as Array<{
      id: string
      salesVoucherId: string | null
      purchaseVoucherId: string | null
    }>
    const byId = new Map(rows.map((r) => [r.id, r]))
    expect(byId.get(salesReceiptId)?.salesVoucherId).toBe(salesId)
    expect(byId.get(purchasePaymentId)?.purchaseVoucherId).toBe(purchaseId)
    expect(byId.get(manualId)?.salesVoucherId).toBeNull()
  })

  it('lọc theo type + category + partnerId + khoảng ngày + keyword', async () => {
    const byCategory = await http()
      .get(`/api/cash/vouchers?type=RECEIPT&category=SALES_CASH&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    expect(byCategory.body.data.map((r: { id: string }) => r.id)).toContain(salesReceiptId)
    expect(byCategory.body.data.map((r: { id: string }) => r.id)).not.toContain(manualId)

    const byPartner = await http()
      .get(`/api/cash/vouchers?partnerId=${CUSTOMER.code}&pageSize=50`)
      .set('Authorization', auth())
      .expect(200)
    expect(Array.isArray(byPartner.body.data)).toBe(true)

    const byKeyword = await http()
      .get(
        `/api/cash/vouchers?keyword=${encodeURIComponent(`${TAG} thu khác`)}&fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`,
      )
      .set('Authorization', auth())
      .expect(200)
    expect(byKeyword.body.data.map((r: { id: string }) => r.id)).toContain(manualId)
  })

  it('PT tự sinh bị xóa tay → sửa chứng từ bán hàng tạo lại PT với id mới', async () => {
    const prisma = prismaOf(app)
    await prisma.cashVoucher.delete({ where: { id: salesReceiptId } })

    const updated = await http()
      .patch(`/api/sales/vouchers/${salesId}`)
      .set('Authorization', auth())
      .send({ description: `${TAG} bán thu ngay (sửa)` })
      .expect(200)
    expect(updated.body.receiptId).not.toBeNull()
    expect(updated.body.receiptId).not.toBe(salesReceiptId)
    salesReceiptId = updated.body.receiptId

    const recreated = await prisma.cashVoucher.findUnique({ where: { id: salesReceiptId } })
    expect(recreated!.category).toBe('SALES_CASH')
  })

  it('PC tự sinh bị xóa tay → sửa chứng từ mua tạo lại PC với id mới', async () => {
    const prisma = prismaOf(app)
    await prisma.cashVoucher.delete({ where: { id: purchasePaymentId } })

    const updated = await http()
      .patch(`/api/purchase/vouchers/${purchaseId}`)
      .set('Authorization', auth())
      .send({ description: `${TAG} mua trả ngay (sửa)` })
      .expect(200)
    expect(updated.body.paymentId).not.toBeNull()
    expect(updated.body.paymentId).not.toBe(purchasePaymentId)
    purchasePaymentId = updated.body.paymentId
  })

  it('GET/PATCH/DELETE/posted phiếu quỹ id không tồn tại → 404', async () => {
    await http().get(`/api/cash/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
    await http()
      .patch(`/api/cash/vouchers/${FAKE_ID}`)
      .set('Authorization', auth())
      .send({ reason: 'x' })
      .expect(404)
    await http()
      .patch(`/api/cash/vouchers/${FAKE_ID}/posted`)
      .set('Authorization', auth())
      .send({ posted: false })
      .expect(404)
    await http().delete(`/api/cash/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
  })

  it('sửa phiếu quỹ không kèm lines → tổng tiền giữ nguyên', async () => {
    const updated = await http()
      .patch(`/api/cash/vouchers/${manualId}`)
      .set('Authorization', auth())
      .send({ payerReceiver: 'Người nộp mới', address: 'Số 2 Hà Nội' })
      .expect(200)
    expect(updated.body.payerReceiver).toBe('Người nộp mới')
    expect(updated.body.totalAmount).toBe('300000')
  })
})
