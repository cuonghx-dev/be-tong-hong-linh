import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// PurchaseService: nhánh còn thiếu là các trường tùy chọn (`dto.X ?? …`), TK
// công nợ đổi theo tùy chọn trả tiền, ghi sổ/bỏ ghi lan sang chứng từ tự sinh,
// và tra nhà cung cấp theo id/mã.
const TAG = 'IT-PUREDGE'
const YEAR = 2026
const DATE = `${YEAR}-07-20`
const DATE2 = `${YEAR}-07-21`
const SUPPLIER = { code: `${TAG}-NCC01`, name: 'NCC Đủ Trường', type: 'ORG' }
const ITEM = 'BECHUADAU'

describe('Purchase service — trường tùy chọn & chứng từ tự sinh (integration)', () => {
  let app: INestApplication
  let token: string
  let supplierRowId: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)
  const patch = (url: string, body: object) =>
    http().patch(url).set('Authorization', auth()).send(body).expect(200)

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteSuppliersByPrefix(prisma, TAG)
    await post('/api/purchase/suppliers', SUPPLIER)
    supplierRowId = (await prisma.supplier.findUniqueOrThrow({ where: { code: SUPPLIER.code } })).id
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  const base = {
    type: 'SERVICE',
    paymentMode: 'UNPAID',
    postingDate: DATE,
    voucherDate: DATE,
    supplierName: SUPPLIER.name,
    description: `${TAG} mua dịch vụ`,
    lines: [{ itemName: 'Dịch vụ', quantity: 1, unitPrice: 1_000_000 }],
  }

  describe('tra nhà cung cấp', () => {
    it('gửi id (uuid) → nhận đúng NCC', async () => {
      const res = await post('/api/purchase/vouchers', { ...base, supplierId: supplierRowId })
      expect(res.body.supplierCode).toBe(SUPPLIER.code)
    })

    it('gửi mã → nhận đúng NCC', async () => {
      const res = await post('/api/purchase/vouchers', { ...base, supplierId: SUPPLIER.code })
      expect(res.body.supplierCode).toBe(SUPPLIER.code)
    })

    it('mã không có trong danh mục → 400', async () => {
      await http()
        .post('/api/purchase/vouchers')
        .set('Authorization', auth())
        .send({ ...base, supplierId: `${TAG}-KHONG-CO` })
        .expect(400)
    })
  })

  describe('chứng từ nhập kho đủ trường', () => {
    let voucherId: string
    let receiptId: string

    it('create với mọi trường tùy chọn → sinh phiếu nhập kho cùng số NK', async () => {
      const res = await post('/api/purchase/vouchers', {
        type: 'STOCK',
        origin: 'DOMESTIC',
        paymentMode: 'UNPAID',
        receiveWithInvoice: true,
        isPurchaseCost: false,
        invoiceTemplate: '01GTKT0/001',
        invoiceSeries: 'AA/26E',
        invoiceNo: 'HD-777',
        invoiceDate: DATE,
        postingDate: DATE,
        voucherDate: DATE,
        supplierId: SUPPLIER.code,
        supplierName: SUPPLIER.name,
        deliverer: 'Anh Giao Hàng',
        address: 'Số 7 Hai Bà Trưng',
        employeeId: 'NV010',
        description: `${TAG} nhập kho đủ trường`,
        attachmentCount: 1,
        contractNo: 'HD-KT-01',
        paymentTermId: 'TT30',
        creditDays: 30,
        dueDate: `${YEAR}-08-20`,
        purchaseCost: 500_000,
        einvoiceLookupCode: 'TRA-CUU-P1',
        einvoiceLookupUrl: 'https://hoadon.example.vn/p1',
        branchId: 'Trụ sở chính',
        lines: [
          {
            itemId: ITEM,
            itemName: 'Bể chứa nhiên liệu 15M3',
            warehouseId: 'KHO VAT TU',
            stockAccount: '156',
            payableAccount: '331',
            unit: 'Cái',
            quantity: 2,
            unitPrice: 5_000_000,
            vatRate: 10,
            vatAccount: '1331',
          },
        ],
      })
      voucherId = res.body.id
      receiptId = res.body.receiptId

      expect(res.body.voucherNo).toMatch(/^NK/)
      expect(res.body.receiptId).not.toBeNull()
      expect(res.body.receiveStatus).toBe('RECEIVED')
      expect(res.body.paymentStatus).toBe('UNPAID')
      expect(res.body.branchId).toBe('Trụ sở chính')
      expect(res.body.invoiceNo).toBe('HD-777')

      // Phiếu nhập kho tự sinh dùng chung số chứng từ và mang thông tin người giao.
      const receipt = await prismaOf(app).inventoryReceipt.findUniqueOrThrow({
        where: { id: receiptId },
        include: { lines: true },
      })
      expect(receipt.voucherNo).toBe(res.body.voucherNo)
      expect(receipt.deliverer).toBe('Anh Giao Hàng')
      expect(receipt.description).toContain(SUPPLIER.name)
      expect(receipt.description).toContain('HD-777')
      expect(receipt.lines[0]?.itemId).toBe(ITEM)
      expect(receipt.lines[0]?.warehouseId).toBe('KHO VAT TU')
    })

    it('update mọi trường tùy chọn; phiếu nhập kho đi theo', async () => {
      const res = await patch(`/api/purchase/vouchers/${voucherId}`, {
        origin: 'DOMESTIC',
        receiveWithInvoice: false,
        invoiceTemplate: '02GTKT0/001',
        invoiceSeries: 'BB/26E',
        invoiceNo: 'HD-778',
        invoiceDate: DATE2,
        postingDate: DATE2,
        voucherDate: DATE2,
        supplierId: SUPPLIER.code,
        supplierName: SUPPLIER.name,
        deliverer: 'Chị Giao Hàng',
        address: 'Số 9 Hai Bà Trưng',
        employeeId: 'NV011',
        description: `${TAG} đã sửa`,
        attachmentCount: 2,
        contractNo: 'HD-KT-02',
        paymentTermId: 'TT45',
        creditDays: 45,
        dueDate: `${YEAR}-09-20`,
        einvoiceLookupCode: 'TRA-CUU-P2',
        einvoiceLookupUrl: 'https://hoadon.example.vn/p2',
        branchId: 'Chi nhánh 1',
      })
      expect(res.body.invoiceNo).toBe('HD-778')
      expect(res.body.receiveStatus).toBe('NOT_RECEIVED')
      expect(res.body.branchId).toBe('Chi nhánh 1')
      expect(res.body.postingDate).toBe(DATE2)

      const receipt = await prismaOf(app).inventoryReceipt.findFirst({
        where: { id: res.body.receiptId },
      })
      expect(receipt?.deliverer).toBe('Chị Giao Hàng')
      expect(receipt?.postingDate.toISOString().slice(0, 10)).toBe(DATE2)
    })

    it('bỏ ghi / ghi sổ lan sang phiếu nhập kho tự sinh', async () => {
      const off = await patch(`/api/purchase/vouchers/${voucherId}/posted`, { posted: false })
      expect(off.body.posted).toBe(false)
      const unposted = await prismaOf(app).inventoryReceipt.findFirst({
        where: { id: off.body.receiptId },
      })
      expect(unposted?.posted).toBe(false)

      const on = await patch(`/api/purchase/vouchers/${voucherId}/posted`, { posted: true })
      expect(on.body.posted).toBe(true)
      const posted = await prismaOf(app).inventoryReceipt.findFirst({
        where: { id: on.body.receiptId },
      })
      expect(posted?.posted).toBe(true)
    })
  })

  describe('trả ngay bằng tiền mặt', () => {
    it('IMMEDIATE → sinh phiếu chi, TK công nợ dòng hàng đổi sang quỹ 1111', async () => {
      const res = await post('/api/purchase/vouchers', {
        ...base,
        paymentMode: 'IMMEDIATE',
        supplierId: SUPPLIER.code,
        description: `${TAG} trả ngay`,
        lines: [
          {
            itemName: 'Dịch vụ trả ngay',
            quantity: 1,
            unitPrice: 2_000_000,
            payableAccount: '331', // không phải TK quỹ → service đổi về 1111
          },
        ],
      })
      expect(res.body.paymentStatus).toBe('PAID')
      expect(res.body.paymentId).not.toBeNull()
      expect(res.body.lines[0].payableAccount).toBe('1111')

      const pc = await prismaOf(app).cashVoucher.findUniqueOrThrow({
        where: { id: res.body.paymentId },
        include: { lines: true },
      })
      expect(pc.category).toBe('PURCHASE_SERVICE_CASH')
      expect(pc.reason).toContain('Chi tiền mua dịch vụ')
      expect(pc.reason).toContain(SUPPLIER.name)
      // Dòng chi tiền lấy TK Nợ từ TK chi phí/kho của dòng hàng.
      expect(pc.lines[0]?.debitAccount).toBe('642')
    })

    it('trả ngay và người dùng chọn sẵn TK quỹ khác → giữ nguyên TK đó', async () => {
      const res = await post('/api/purchase/vouchers', {
        ...base,
        paymentMode: 'IMMEDIATE',
        supplierId: SUPPLIER.code,
        description: `${TAG} trả ngay TK quỹ`,
        lines: [
          {
            itemName: 'Dịch vụ',
            quantity: 1,
            unitPrice: 1_000_000,
            payableAccount: '1112',
          },
        ],
      })
      expect(res.body.lines[0].payableAccount).toBe('1112')
    })

    it('có thuế GTGT → phiếu chi thêm dòng thuế đầu vào', async () => {
      const res = await post('/api/purchase/vouchers', {
        ...base,
        paymentMode: 'IMMEDIATE',
        supplierId: SUPPLIER.code,
        invoiceNo: 'HD-999',
        description: `${TAG} trả ngay có thuế`,
        lines: [
          {
            itemName: 'Dịch vụ có thuế',
            quantity: 1,
            unitPrice: 1_000_000,
            vatRate: 10,
            vatAccount: '1331',
          },
        ],
      })
      const pc = await prismaOf(app).cashVoucher.findUniqueOrThrow({
        where: { id: res.body.paymentId },
        include: { lines: true },
      })
      const vatLine = pc.lines.find((l) => l.debitAccount === '1331')
      expect(vatLine).toBeDefined()
      expect(Number(vatLine?.amount)).toBe(100_000)
      expect(pc.reason).toContain('HD-999')
    })
  })
})
