import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Nhánh biên của 6 parser chứng từ (spec voucher-import chỉ đi đường thành công):
// không tìm thấy header, thiếu cột tùy chọn, dòng thiếu số chứng từ, ngày hỏng
// (mỗi parser xử lý khác nhau — bank bỏ dòng, còn lại lấy ngày hiện tại) và các
// hàm map văn bản → enum trạng thái.
const TAG = 'IT-VIMPEDGE'

function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const TODAY = new Date().toISOString().slice(0, 10)

describe('Voucher import — nhánh biên parser (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const upload = (url: string, rows: unknown[][]) =>
    http()
      .post(url)
      .set('Authorization', auth())
      .attach('file', buildXlsx(rows), 'voucher.xlsx')
      .expect(201)

  const EMPTY = { total: 0, created: 0, skipped: 0 }

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    const where = { voucherNo: { contains: TAG } }
    await prisma.purchaseVoucher.deleteMany({ where })
    await prisma.salesVoucher.deleteMany({ where })
    await prisma.bankVoucher.deleteMany({ where })
    await prisma.inventoryReceipt.deleteMany({ where })
    await prisma.goodsIssueVoucher.deleteMany({ where })
    await prisma.generalVoucher.deleteMany({ where })
    await app.close()
  })

  describe('mua hàng', () => {
    const URL = '/api/purchase/vouchers/import'

    it('không có cột "Số chứng từ" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Ngày hạch toán', 'Tổng tiền thanh toán'],
        ['2026-03-10', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('chỉ có cột số chứng từ → mọi số 0, trạng thái mặc định, ngày = hôm nay', async () => {
      const no = `MH-${TAG}-MIN`
      const res = await upload(URL, [['Số chứng từ'], [no], [null]])
      expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

      const v = await prismaOf(app).purchaseVoucher.findFirst({ where: { voucherNo: no } })
      expect(v?.type).toBe('NON_STOCK')
      expect(v?.receiveStatus).toBe('NOT_RECEIVED')
      expect(v?.paymentStatus).toBe('UNPAID')
      expect(v?.invoiceNo).toBeNull()
      expect(v?.branchId).toBeNull()
      expect(v?.postingDate.toISOString().slice(0, 10)).toBe(TODAY)
    })

    it('map trạng thái thanh toán: một phần / đã thanh toán / văn bản lạ', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'TT thanh toán', 'TT nhận hóa đơn'],
        [`MH-${TAG}-P1`, '2026-03-10', 'Đã thanh toán một phần', 'Đã nhận hóa đơn'],
        [`MH-${TAG}-P2`, '2026-03-10', 'Đã thanh toán', 'Chưa nhận'],
        [`MH-${TAG}-P3`, '2026-03-10', 'Trạng thái lạ', 'Trạng thái lạ'],
      ])
      expect(res.body).toEqual({ total: 3, created: 3, skipped: 0 })

      const rows = await prismaOf(app).purchaseVoucher.findMany({
        where: { voucherNo: { contains: `MH-${TAG}-P` } },
        orderBy: { voucherNo: 'asc' },
      })
      expect(rows.map((r) => r.paymentStatus)).toEqual(['PARTIAL', 'PAID', 'UNPAID'])
      expect(rows.map((r) => r.receiveStatus)).toEqual([
        'RECEIVED',
        'NOT_RECEIVED',
        'NOT_RECEIVED',
      ])
    })
  })

  describe('bán hàng', () => {
    const URL = '/api/sales/vouchers/import'

    it('không có cột "Số chứng từ" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Khách hàng', 'Tổng tiền thanh toán'],
        ['Khách A', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('map cờ hóa đơn / thanh toán / xuất hàng, thiếu cột → false', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'TT lập hóa đơn', 'TT thanh toán', 'TT xuất hàng'],
        [`BH-${TAG}-S1`, '2026-03-10', 'Đã lập hóa đơn', 'Đã thanh toán', 'Đã xuất kho'],
        [`BH-${TAG}-S2`, '2026-03-10', 'Chưa lập', 'Chưa thanh toán', 'Chưa xuất'],
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const rows = await prismaOf(app).salesVoucher.findMany({
        where: { voucherNo: { contains: `BH-${TAG}-S` } },
        orderBy: { voucherNo: 'asc' },
      })
      expect(rows.map((r) => r.withInvoice)).toEqual([true, false])
      expect(rows.map((r) => r.paymentMode)).toEqual(['PAID_NOW', 'UNPAID'])
    })

    it('chỉ có cột số chứng từ → cờ mặc định false, ngày = hôm nay', async () => {
      const no = `BH-${TAG}-MIN`
      const res = await upload(URL, [['Số chứng từ'], [no]])
      expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

      const v = await prismaOf(app).salesVoucher.findFirst({ where: { voucherNo: no } })
      expect(v?.withInvoice).toBe(false)
      expect(v?.paymentMode).toBe('UNPAID')
      expect(v?.customerName).toBeNull()
      expect(v?.postingDate.toISOString().slice(0, 10)).toBe(TODAY)
    })
  })

  describe('tiền gửi ngân hàng', () => {
    const URL = '/api/bank/vouchers/import'

    it('không có cột "Số chứng từ" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Diễn giải', 'Số tiền'],
        ['Thu tiền', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('dòng không có ngày (footer "Cộng") bị bỏ hẳn, không lấy ngày hiện tại', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'Số tiền', 'Loại chứng từ'],
        ['Cộng', null, 8_900_000_000, null],
        [`NTTK-${TAG}-B1`, '2026-03-10', 1_000_000, 'Thu tiền gửi'],
      ])
      expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })
      expect(
        await prismaOf(app).bankVoucher.findFirst({ where: { voucherNo: 'Cộng' } }),
      ).toBeNull()
    })

    it('tiền tố NTTK → thu, còn lại → chi; loại lạ → quy về loại chung theo tiền tố', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'Số tiền', 'Loại chứng từ', 'Số tài khoản NH'],
        [`NTTK-${TAG}-B2`, '2026-03-11', 1_000_000, 'Loại lạ', '113366889999'],
        [`UNC-${TAG}-B3`, '2026-03-11', 2_000_000, 'Ủy nhiệm chi', null],
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const thu = await prismaOf(app).bankVoucher.findFirst({
        where: { voucherNo: `NTTK-${TAG}-B2` },
      })
      expect(thu?.type).toBe('RECEIPT')
      expect(thu?.category).toBe('RECEIPT')
      expect(thu?.bankAccountNo).toBe('113366889999')

      const chi = await prismaOf(app).bankVoucher.findFirst({
        where: { voucherNo: `UNC-${TAG}-B3` },
      })
      expect(chi?.type).toBe('PAYMENT')
      expect(chi?.category).toBe('PAYMENT')
      expect(chi?.bankAccountNo).toBeNull()
    })
  })

  describe('nhập kho', () => {
    const URL = '/api/inventory/receipts/import'

    it('không có cột "Số chứng từ" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Ngày hạch toán', 'Tổng tiền'],
        ['2026-03-10', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('loại chứng từ "thành phẩm" → nhập thành phẩm, còn lại → mua hàng', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'Loại chứng từ', 'Tổng tiền', 'Người giao'],
        [`NK-${TAG}-R1`, '2026-03-10', 'Nhập kho thành phẩm', 5_000_000, 'Anh A'],
        [`NK-${TAG}-R2`, '2026-03-10', 'Nhập kho mua hàng', 3_000_000, null],
        [null, '2026-03-10', 'Tổng', 8_000_000, null],
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const rows = await prismaOf(app).inventoryReceipt.findMany({
        where: { voucherNo: { contains: `NK-${TAG}-R` } },
        orderBy: { voucherNo: 'asc' },
      })
      expect(rows.map((r) => r.receiptType)).toEqual(['FINISHED_GOODS', 'PURCHASE'])
      expect(rows[0]?.deliverer).toBe('Anh A')
      expect(rows[1]?.deliverer).toBeNull()
    })
  })

  describe('xuất kho', () => {
    const URL = '/api/inventory/issues/import'

    it('không có cột "Số chứng từ" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Ngày hạch toán', 'Tổng tiền'],
        ['2026-03-10', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('loại chứng từ "sản xuất" → xuất sản xuất, còn lại → bán hàng; cột thiếu → null', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'Loại chứng từ', 'Người nhận'],
        [`XK-${TAG}-I1`, '2026-03-10', 'Xuất kho sản xuất', 'Chị B'],
        [`XK-${TAG}-I2`, '2026-03-10', 'Xuất kho bán hàng', null],
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const rows = await prismaOf(app).goodsIssueVoucher.findMany({
        where: { voucherNo: { contains: `XK-${TAG}-I` } },
        orderBy: { voucherNo: 'asc' },
      })
      expect(rows.map((r) => r.category)).toEqual(['PRODUCTION', 'SALES'])
      expect(rows[0]?.receiver).toBe('Chị B')
      expect(rows[1]?.receiver).toBeNull()
      // Các cột trạng thái không có trong file → null.
      expect(rows[0]?.salesDocStatus).toBeNull()
      expect(rows[0]?.invoiceIssueStatus).toBeNull()
      expect(rows[0]?.taxAuthorityCode).toBeNull()
    })
  })

  describe('nghiệp vụ khác', () => {
    const URL = '/api/general/vouchers/import'

    it('không có cột "Số chứng từ" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Diễn giải', 'Số tiền'],
        ['Bút toán', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('thiếu "Ngày chứng từ" → lấy ngày hạch toán; ngày hỏng → hôm nay', async () => {
      const res = await upload(URL, [
        ['Số chứng từ', 'Ngày hạch toán', 'Ngày chứng từ', 'Số tiền'],
        [`NVK-${TAG}-G1`, '2026-03-10', null, 1_000_000],
        [`NVK-${TAG}-G2`, 'không phải ngày', '2026-03-12', 2_000_000],
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const g1 = await prismaOf(app).generalVoucher.findFirst({
        where: { voucherNo: `NVK-${TAG}-G1` },
      })
      expect(g1?.postingDate.toISOString().slice(0, 10)).toBe('2026-03-10')
      expect(g1?.voucherDate.toISOString().slice(0, 10)).toBe('2026-03-10')

      const g2 = await prismaOf(app).generalVoucher.findFirst({
        where: { voucherNo: `NVK-${TAG}-G2` },
      })
      expect(g2?.postingDate.toISOString().slice(0, 10)).toBe(TODAY)
      expect(g2?.voucherDate.toISOString().slice(0, 10)).toBe('2026-03-12')
    })
  })
})
