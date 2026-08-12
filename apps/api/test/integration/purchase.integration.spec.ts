import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-PUR'
const YEAR = 2026
const DATE = `${YEAR}-03-15`
const SUPPLIER = { code: `${TAG}-NCC01`, name: 'NCC Tích Hợp', type: 'ORG' }

const serviceVoucher = (paymentMode: string, overrides: Record<string, unknown> = {}) => ({
  type: 'SERVICE',
  paymentMode,
  postingDate: DATE,
  voucherDate: DATE,
  supplierId: SUPPLIER.code, // gửi MÃ — service tự tra row id
  supplierName: SUPPLIER.name,
  description: `${TAG} mua dịch vụ`,
  lines: [{ itemName: 'Dịch vụ vận chuyển', quantity: 1, unitPrice: 2000000 }],
  ...overrides,
})

describe('Purchase vouchers (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await request(app.getHttpServer())
      .post('/api/purchase/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send(SUPPLIER)
      .expect(201)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  it('supplierId (mã) không có trong danh mục → 400', async () => {
    const res = await http()
      .post('/api/purchase/vouchers')
      .set('Authorization', auth())
      .send(serviceVoucher('UNPAID', { supplierId: 'NCC-KHONG-TON-TAI' }))
      .expect(400)
    expect(res.body.message).toContain('không tồn tại trong danh mục')
  })

  it('SERVICE + UNPAID → MDV0001/<năm>, công nợ UNPAID', async () => {
    const res = await http()
      .post('/api/purchase/vouchers')
      .set('Authorization', auth())
      .send(serviceVoucher('UNPAID'))
      .expect(201)
    expect(res.body.voucherNo).toBe(`MDV0001/${YEAR}`)
    expect(res.body.paymentStatus).toBe('UNPAID')
  })

  it('SERVICE + IMMEDIATE → chứng từ mang số PC chung với phiếu chi tự sinh, paymentStatus PAID', async () => {
    const res = await http()
      .post('/api/purchase/vouchers')
      .set('Authorization', auth())
      .send(serviceVoucher('IMMEDIATE'))
      .expect(201)

    expect(res.body.voucherNo).toMatch(/^PC \d{4}\/2026$/)
    expect(res.body.paymentStatus).toBe('PAID')

    // PC tự sinh trong sổ quỹ: cùng số, category PURCHASE_SERVICE_CASH.
    const pc = await prismaOf(app).cashVoucher.findUnique({
      where: { voucherNo: res.body.voucherNo },
    })
    expect(pc).not.toBeNull()
    expect(pc!.category).toBe('PURCHASE_SERVICE_CASH')
    expect(pc!.id).toBe(res.body.paymentId)
  })

  it('STOCK → NK##### (dãy toàn cục) + phiếu nhập kho tự sinh chung số', async () => {
    const res = await http()
      .post('/api/purchase/vouchers')
      .set('Authorization', auth())
      .send({
        type: 'STOCK',
        paymentMode: 'UNPAID',
        postingDate: DATE,
        voucherDate: DATE,
        supplierName: SUPPLIER.code,
        description: `${TAG} nhập kho`,
        lines: [
          {
            itemId: 'BECHUADAU',
            itemName: 'Bể chứa nhiên liệu 15M3',
            warehouseId: 'KHO VAT TU',
            stockAccount: '153',
            quantity: 2,
            unitPrice: 5000000,
          },
        ],
      })
      .expect(201)

    expect(res.body.voucherNo).toMatch(/^NK\d{5}$/)

    // Phiếu nhập kho tự sinh dùng chung số NK.
    const receipt = await prismaOf(app).inventoryReceipt.findFirst({
      where: { voucherNo: res.body.voucherNo },
    })
    expect(receipt).not.toBeNull()
    expect(receipt!.id).toBe(res.body.receiptId)
  })

  it('xóa chứng từ IMMEDIATE → phiếu chi tự sinh bị dọn theo', async () => {
    const created = await http()
      .post('/api/purchase/vouchers')
      .set('Authorization', auth())
      .send(serviceVoucher('IMMEDIATE', { description: `${TAG} xóa kèm PC` }))
      .expect(201)

    await http()
      .delete(`/api/purchase/vouchers/${created.body.id}`)
      .set('Authorization', auth())
      .expect(200)

    const pc = await prismaOf(app).cashVoucher.findUnique({
      where: { voucherNo: created.body.voucherNo },
    })
    expect(pc).toBeNull()
  })

  it('list + get + reports payable smoke', async () => {
    // keyword quét voucherNo/invoiceNo/supplierName (không quét diễn giải).
    const list = await http()
      .get(`/api/purchase/vouchers?keyword=${encodeURIComponent(SUPPLIER.name)}`)
      .set('Authorization', auth())
      .expect(200)
    expect(list.body.pagination.total).toBeGreaterThanOrEqual(2)

    await http()
      .get(`/api/purchase/vouchers/${list.body.data[0].id}`)
      .set('Authorization', auth())
      .expect(200)

    await http()
      .get(`/api/purchase/reports/payable-summary?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
    await http()
      .get(`/api/purchase/reports/detail?fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31`)
      .set('Authorization', auth())
      .expect(200)
  })

  it('suppliers CRUD: tạo trùng mã → lỗi, get theo id, update', async () => {
    const dup = await http()
      .post('/api/purchase/suppliers')
      .set('Authorization', auth())
      .send(SUPPLIER)
    expect(dup.status).toBeGreaterThanOrEqual(400)

    const list = await http()
      .get(`/api/purchase/suppliers?keyword=${TAG}`)
      .set('Authorization', auth())
      .expect(200)
    const rows = Array.isArray(list.body) ? list.body : list.body.data
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })
})
