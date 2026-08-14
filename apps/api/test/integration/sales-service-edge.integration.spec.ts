import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// SalesService: nhánh còn thiếu là các trường tùy chọn (`dto.X ?? …`) và việc
// đồng bộ chứng từ tự sinh khi đổi tùy chọn (phiếu thu / phiếu xuất kho).
// Spec dựng chứng từ "đủ trường", sửa "đủ trường", rồi bật/tắt từng liên kết.
const TAG = 'IT-SALEDGE'
const YEAR = 2026
const DATE = `${YEAR}-07-15`
const DATE2 = `${YEAR}-07-16`
const CUSTOMER = { code: `${TAG}-KH01`, name: 'Khách Đủ Trường' }
const ITEM = 'BECHUADAU'
const ITEM_NAME = 'Bể chứa nhiên liệu 15M3'

describe('Sales service — trường tùy chọn & chứng từ tự sinh (integration)', () => {
  let app: INestApplication
  let token: string
  let customerRowId: string

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
    await deleteCustomersByPrefix(prisma, TAG)
    await post('/api/sales/customers', CUSTOMER)
    customerRowId = (await prisma.customer.findUniqueOrThrow({ where: { code: CUSTOMER.code } })).id
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('tra khách hàng', () => {
    const base = {
      voucherType: 'DOMESTIC_GOODS',
      paymentMode: 'UNPAID',
      postingDate: DATE,
      voucherDate: DATE,
      customerName: CUSTOMER.name,
      description: `${TAG} tra KH`,
      lines: [{ itemName: 'Hàng', quantity: 1, unitPrice: 100_000 }],
    }

    it('gửi id (uuid) → nhận đúng khách hàng', async () => {
      const res = await post('/api/sales/vouchers', { ...base, customerId: customerRowId })
      expect(res.body.customerCode).toBe(CUSTOMER.code)
    })

    it('gửi mã → nhận đúng khách hàng', async () => {
      const res = await post('/api/sales/vouchers', { ...base, customerId: CUSTOMER.code })
      expect(res.body.customerCode).toBe(CUSTOMER.code)
    })

    it('mã không có trong danh mục → 400', async () => {
      await http()
        .post('/api/sales/vouchers')
        .set('Authorization', auth())
        .send({ ...base, customerId: `${TAG}-KHONG-CO` })
        .expect(400)
    })

    it('không gửi customerId → chứng từ không gắn khách hàng', async () => {
      const res = await post('/api/sales/vouchers', base)
      expect(res.body.customerCode ?? null).toBeNull()
    })
  })

  describe('chứng từ đủ trường', () => {
    let voucherId: string

    it('create với mọi trường tùy chọn + kiêm phiếu xuất kho', async () => {
      const res = await post('/api/sales/vouchers', {
        voucherType: 'DOMESTIC_GOODS',
        paymentMode: 'UNPAID',
        isInventoryIssue: true,
        withInvoice: true,
        isPosInvoice: true,
        invoiceNo: 'HD-0001',
        postingDate: DATE,
        voucherDate: DATE,
        customerId: CUSTOMER.code,
        customerName: CUSTOMER.name,
        taxCode: '0101010101',
        contactPerson: 'Anh Liên Hệ',
        address: 'Số 3 Nguyễn Du',
        salesEmployeeId: 'NV001',
        description: `${TAG} đủ trường`,
        attachmentCount: 2,
        paymentTermId: 'TT30',
        creditDays: 30,
        dueDate: `${YEAR}-08-15`,
        einvoiceLookupCode: 'TRA-CUU-1',
        einvoiceLookupUrl: 'https://hoadon.example.vn',
        issueReason: 'Xuất bán theo hợp đồng',
        invoiceForm: '01GTKT',
        invoiceSerial: 'AA/26E',
        invoiceDate: DATE,
        buyerName: 'Người Mua',
        invoicePaymentForm: 'CASH',
        bankAccountNo: '113366889999',
        phone: '0912345678',
        budgetRelationCode: 'NS-1',
        idCardNo: '001099001122',
        passportNo: 'B1234567',
        branchId: 'Trụ sở chính',
        lines: [
          {
            itemId: ITEM,
            itemName: ITEM_NAME,
            unit: 'Cái',
            quantity: 2,
            unitPrice: 5_000_000,
            tradeDiscount: 100_000,
            vatRate: 10,
            vatAccount: '33311',
            debtAccount: '131',
            revenueAccount: '511',
            lotNo: 'LO-1',
            warehouseId: 'KHO VAT TU',
            costAccount: '632',
            inventoryAccount: '156',
            costPrice: 3_000_000,
          },
        ],
      })
      voucherId = res.body.id

      expect(res.body.issueId).not.toBeNull()
      expect(res.body.invoiceNo).toBe('HD-0001')
      expect(res.body.withInvoice).toBe(true)
      expect(res.body.isPosInvoice).toBe(true)
      expect(res.body.branchId).toBe('Trụ sở chính')

      // Phiếu xuất kho tự sinh lấy lý do + thông tin từ chứng từ bán.
      const issue = await prismaOf(app).goodsIssueVoucher.findUniqueOrThrow({
        where: { id: res.body.issueId },
        include: { lines: true },
      })
      expect(issue.description).toBe('Xuất bán theo hợp đồng')
      expect(issue.receiver).toBe('Anh Liên Hệ')
      expect(issue.lines[0]?.itemId).toBe(ITEM)
      expect(issue.lines[0]?.warehouseId).toBe('KHO VAT TU')
      expect(issue.lines[0]?.debitAccount).toBe('632')
      expect(issue.lines[0]?.creditAccount).toBe('156')
      // costPrice > 0 → dùng giá vốn nhập tay.
      expect(Number(issue.lines[0]?.unitPrice)).toBe(3_000_000)
    })

    it('update mọi trường tùy chọn', async () => {
      const res = await patch(`/api/sales/vouchers/${voucherId}`, {
        withInvoice: false,
        isPosInvoice: false,
        invoiceNo: 'HD-0002',
        postingDate: DATE2,
        voucherDate: DATE2,
        customerId: CUSTOMER.code,
        customerName: CUSTOMER.name,
        taxCode: '0202020202',
        contactPerson: 'Chị Liên Hệ',
        address: 'Số 5 Lý Thường Kiệt',
        salesEmployeeId: 'NV002',
        description: `${TAG} đã sửa`,
        attachmentCount: 3,
        paymentTermId: 'TT45',
        creditDays: 45,
        dueDate: `${YEAR}-09-15`,
        einvoiceLookupCode: 'TRA-CUU-2',
        einvoiceLookupUrl: 'https://hoadon2.example.vn',
        issueReason: 'Xuất bán đợt 2',
        invoiceForm: '02GTKT',
        invoiceSerial: 'BB/26E',
        invoiceDate: DATE2,
        buyerName: 'Người Mua 2',
        branchId: 'Chi nhánh 1',
      })
      expect(res.body.invoiceNo).toBe('HD-0002')
      expect(res.body.description).toBe(`${TAG} đã sửa`)
      expect(res.body.branchId).toBe('Chi nhánh 1')
      expect(res.body.postingDate).toBe(DATE2)
      // Số chứng từ giữ nguyên sau khi sửa.
      expect(res.body.voucherNo).toMatch(/^BH/)
    })

    it('tắt kiêm phiếu xuất → phiếu xuất kho bị xóa', async () => {
      const before = await prismaOf(app).salesVoucher.findUniqueOrThrow({
        where: { id: voucherId },
      })
      expect(before.issueId).not.toBeNull()

      const res = await patch(`/api/sales/vouchers/${voucherId}`, { isInventoryIssue: false })
      expect(res.body.issueId).toBeNull()
      expect(
        await prismaOf(app).goodsIssueVoucher.findUnique({ where: { id: before.issueId! } }),
      ).toBeNull()
    })

    it('chuyển sang thu ngay → sinh phiếu thu; quay lại chưa thu → xóa phiếu thu', async () => {
      const paid = await patch(`/api/sales/vouchers/${voucherId}`, { paymentMode: 'PAID_NOW' })
      expect(paid.body.receiptId).not.toBeNull()
      const receiptId: string = paid.body.receiptId
      const pt = await prismaOf(app).cashVoucher.findUniqueOrThrow({ where: { id: receiptId } })
      expect(pt.category).toBe('SALES_CASH')

      const unpaid = await patch(`/api/sales/vouchers/${voucherId}`, { paymentMode: 'UNPAID' })
      expect(unpaid.body.receiptId).toBeNull()
      expect(await prismaOf(app).cashVoucher.findUnique({ where: { id: receiptId } })).toBeNull()
    })

    it('bật lại kiêm phiếu xuất, dòng hàng khớp theo TÊN mặt hàng', async () => {
      const res = await patch(`/api/sales/vouchers/${voucherId}`, {
        isInventoryIssue: true,
        issueReason: '',
        lines: [
          {
            itemName: ITEM_NAME, // không gửi itemId → tra danh mục theo tên
            quantity: 1,
            unitPrice: 5_000_000,
            costPrice: 0, // → lấy đơn giá mua của VTHH
          },
        ],
      })
      expect(res.body.issueId).not.toBeNull()

      const issue = await prismaOf(app).goodsIssueVoucher.findUniqueOrThrow({
        where: { id: res.body.issueId },
        include: { lines: true },
      })
      // issueReason rỗng → tự sinh diễn giải theo khách hàng + số chứng từ.
      expect(issue.description).toContain('Xuất kho bán hàng')
      expect(issue.description).toContain(CUSTOMER.name)
      // Khớp VTHH theo tên → lấy mã + kho ngầm định từ danh mục.
      expect(issue.lines[0]?.itemId).toBe(ITEM)
    })
  })
})
