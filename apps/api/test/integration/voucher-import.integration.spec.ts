import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-VIMP'

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Import chứng từ 5 phân hệ (purchase/sales/bank/nhập kho/xuất kho): parser đọc
// header theo tên cột, service bỏ qua số chứng từ trùng (DB + trong chính file).
describe('Voucher import xlsx (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    // Line có FK onDelete Cascade — xóa header là đủ.
    await prisma.purchaseVoucher.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await prisma.salesVoucher.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await prisma.bankVoucher.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await prisma.inventoryReceipt.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await prisma.goodsIssueVoucher.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('POST /api/purchase/vouchers/import', () => {
    const HEADER = [
      'Số chứng từ',
      'Ngày hạch toán',
      'Số hóa đơn',
      'Nhà cung cấp',
      'Tổng tiền thanh toán',
      'Chi phí mua hàng',
      'Giá trị nhập kho',
      'TT nhận hóa đơn',
      'TT thanh toán',
    ]

    it('NK→nhập kho, MDV→dịch vụ, còn lại→không qua kho; tách tiền hàng/thuế từ giá trị nhập kho', async () => {
      const buffer = buildXlsx([
        HEADER,
        // Nhập kho: tiền hàng = GT nhập kho − chi phí = 105tr − 5tr = 100tr, thuế = 110tr − 100tr.
        [`NK-${TAG}-1`, '2026-03-10', 'HD001', 'NCC Kiểm Thử', 110000000, 5000000, 105000000, 'Chưa nhận', 'Chưa thanh toán'],
        [`MDV-${TAG}-1`, '2026-03-11', 'HD002', null, 22000000, 0, 0, 'Đã nhận hóa đơn', 'Đã thanh toán'],
        [`MH-${TAG}-1`, '2026-03-12', null, null, 33000000, 0, 0, 'Chưa nhận', 'Đã thanh toán một phần'],
        // Trùng trong chính file → bị khử.
        [`NK-${TAG}-1`, '2026-03-10', 'HD001', 'NCC Kiểm Thử', 110000000, 5000000, 105000000, 'Chưa nhận', 'Chưa thanh toán'],
      ])

      const res = await http()
        .post('/api/purchase/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'mua-hang-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 4, created: 3, skipped: 1 })

      const prisma = prismaOf(app)
      const nk = await prisma.purchaseVoucher.findFirst({
        where: { voucherNo: `NK-${TAG}-1` },
        include: { lines: true },
      })
      expect(nk?.type).toBe('STOCK')
      expect(nk?.totalGoods.toString()).toBe('100000000')
      expect(nk?.totalVat.toString()).toBe('10000000')
      expect(nk?.paymentStatus).toBe('UNPAID')
      expect(nk?.lines).toHaveLength(1)

      const mdv = await prisma.purchaseVoucher.findFirst({ where: { voucherNo: `MDV-${TAG}-1` } })
      expect(mdv?.type).toBe('SERVICE')
      expect(mdv?.paymentStatus).toBe('PAID')
      expect(mdv?.paymentMode).toBe('IMMEDIATE')
      expect(mdv?.receiveStatus).toBe('RECEIVED')

      const mh = await prisma.purchaseVoucher.findFirst({ where: { voucherNo: `MH-${TAG}-1` } })
      expect(mh?.type).toBe('NON_STOCK')
      expect(mh?.paymentStatus).toBe('PARTIAL')

      // Nhập lại chính file → skipped toàn bộ.
      const again = await http()
        .post('/api/purchase/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'mua-hang-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 4, created: 0, skipped: 4 })
    })

    it('thiếu file → 400 "Thiếu file Excel"', async () => {
      const res = await http()
        .post('/api/purchase/vouchers/import')
        .set('Authorization', auth())
        .expect(400)
      expect(res.body.message).toBe('Thiếu file Excel')
    })
  })

  describe('POST /api/sales/vouchers/import', () => {
    const HEADER = [
      'Số chứng từ',
      'Số hóa đơn',
      'Ngày hạch toán',
      'Khách hàng',
      'Tổng tiền thanh toán',
      'TT lập hóa đơn',
      'TT thanh toán',
      'TT xuất hàng',
    ]

    it('đã thanh toán → PAID_NOW (Nợ 1111), chưa thu → UNPAID (Nợ 131)', async () => {
      const buffer = buildXlsx([
        HEADER,
        [`BH-${TAG}-1`, 'HD100', '2026-03-15', 'KH Kiểm Thử', 50000000, 'Chưa lập', 'Chưa thanh toán', 'Chưa xuất'],
        [`BH-${TAG}-2`, 'HD101', '2026-03-16', null, 12000000, 'Đã lập hóa đơn', 'Đã thanh toán', 'Đã xuất hàng'],
      ])

      const res = await http()
        .post('/api/sales/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ban-hang-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const prisma = prismaOf(app)
      const unpaid = await prisma.salesVoucher.findFirst({
        where: { voucherNo: `BH-${TAG}-1` },
        include: { lines: true },
      })
      expect(unpaid?.paymentMode).toBe('UNPAID')
      expect(unpaid?.withInvoice).toBe(false)
      expect(unpaid?.lines[0]?.debtAccount).toBe('131')

      const paid = await prisma.salesVoucher.findFirst({
        where: { voucherNo: `BH-${TAG}-2` },
        include: { lines: true },
      })
      expect(paid?.paymentMode).toBe('PAID_NOW')
      expect(paid?.withInvoice).toBe(true)
      expect(paid?.isInventoryIssue).toBe(true)
      expect(paid?.lines[0]?.debtAccount).toBe('1111')
      expect(paid?.totalAmount.toString()).toBe('12000000')

      const again = await http()
        .post('/api/sales/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ban-hang-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 2, created: 0, skipped: 2 })
    })
  })

  describe('POST /api/bank/vouchers/import', () => {
    const HEADER = [
      'Số chứng từ',
      'Ngày hạch toán',
      'Diễn giải',
      'Số tiền',
      'Đối tượng',
      'Số tài khoản NH',
      'Lý do thu/chi',
      'Loại chứng từ',
    ]

    it('NTTK→thu (Nợ 1121), UNC→chi (Có 1121); dòng footer "Cộng" không có ngày bị loại', async () => {
      const buffer = buildXlsx([
        HEADER,
        [`NTTK-${TAG}-1`, '2026-03-20', 'Thu tiền gửi kiểm thử', 15000000, null, '999888777', 'Thu khác', 'Thu tiền gửi'],
        [`UNC-${TAG}-1`, '2026-03-21', 'Chi tiền gửi kiểm thử', 8000000, null, '999888777', 'Chi khác', 'Ủy nhiệm chi'],
        // Footer MISA: có chữ ở cột số chứng từ nhưng không có ngày → parser phải bỏ qua.
        ['Cộng', null, null, 23000000, null, null, null, null],
      ])

      const res = await http()
        .post('/api/bank/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tien-gui-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const prisma = prismaOf(app)
      const receipt = await prisma.bankVoucher.findFirst({
        where: { voucherNo: `NTTK-${TAG}-1` },
        include: { lines: true },
      })
      expect(receipt?.type).toBe('RECEIPT')
      expect(receipt?.lines[0]?.debitAccount).toBe('1121')
      expect(receipt?.totalAmount.toString()).toBe('15000000')

      const payment = await prisma.bankVoucher.findFirst({
        where: { voucherNo: `UNC-${TAG}-1` },
        include: { lines: true },
      })
      expect(payment?.type).toBe('PAYMENT')
      expect(payment?.lines[0]?.creditAccount).toBe('1121')
    })
  })

  describe('POST /api/inventory/receipts/import', () => {
    const HEADER = ['Ngày hạch toán', 'Số chứng từ', 'Diễn giải', 'Tổng tiền', 'Người giao', 'Loại chứng từ']

    it('loại suy từ text: thành phẩm → FINISHED_GOODS, còn lại → PURCHASE', async () => {
      const buffer = buildXlsx([
        HEADER,
        ['2026-03-22', `NKM-${TAG}-1`, 'Mua hàng của NCC Kiểm Thử theo hóa đơn số 9', 40000000, 'Người giao IT', 'Nhập kho mua hàng'],
        ['2026-03-23', `NKTP-${TAG}-1`, 'Nhập kho thành phẩm IT', 25000000, null, 'Nhập kho thành phẩm'],
      ])

      const res = await http()
        .post('/api/inventory/receipts/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'nhap-kho-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const prisma = prismaOf(app)
      const purchase = await prisma.inventoryReceipt.findFirst({
        where: { voucherNo: `NKM-${TAG}-1` },
        include: { lines: true },
      })
      expect(purchase?.receiptType).toBe('PURCHASE')
      expect(purchase?.totalAmount.toString()).toBe('40000000')
      expect(purchase?.lines).toHaveLength(1)

      const finished = await prisma.inventoryReceipt.findFirst({ where: { voucherNo: `NKTP-${TAG}-1` } })
      expect(finished?.receiptType).toBe('FINISHED_GOODS')
    })
  })

  describe('POST /api/inventory/issues/import', () => {
    const HEADER = ['Ngày hạch toán', 'Số chứng từ', 'Diễn giải', 'Tổng tiền', 'Người nhận', 'Loại chứng từ']

    it('lý do xuất suy từ text: sản xuất → PRODUCTION, mặc định → SALES', async () => {
      const buffer = buildXlsx([
        HEADER,
        ['2026-03-24', `XK-${TAG}-1`, 'Xuất bán kiểm thử', 30000000, 'Người nhận IT', 'Xuất kho bán hàng'],
        ['2026-03-25', `XK-${TAG}-2`, 'Xuất sản xuất kiểm thử', 7000000, null, 'Xuất kho sản xuất'],
      ])

      const res = await http()
        .post('/api/inventory/issues/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'xuat-kho-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const prisma = prismaOf(app)
      const sales = await prisma.goodsIssueVoucher.findFirst({ where: { voucherNo: `XK-${TAG}-1` } })
      expect(sales?.category).toBe('SALES')
      const production = await prisma.goodsIssueVoucher.findFirst({ where: { voucherNo: `XK-${TAG}-2` } })
      expect(production?.category).toBe('PRODUCTION')
    })
  })

  // Không tìm thấy hàng header ("Số chứng từ") → parser trả rỗng, service trả 0/0/0.
  describe.each([
    '/api/purchase/vouchers/import',
    '/api/sales/vouchers/import',
    '/api/bank/vouchers/import',
    '/api/inventory/receipts/import',
    '/api/inventory/issues/import',
  ])('POST %s — file không có header hợp lệ', (route) => {
    it('→ total 0', async () => {
      const res = await http()
        .post(route)
        .set('Authorization', auth())
        .attach('file', buildXlsx([['Cột lạ'], ['x']]), 'rong.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
    })
  })
})
