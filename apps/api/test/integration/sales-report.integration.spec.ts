import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// SalesReportService (/api/sales/reports/*) chưa có spec riêng: sổ chi tiết bán
// hàng, tổng hợp theo mặt hàng, tổng hợp + chi tiết công nợ 131. Phủ các nhánh
// quy đối tượng (theo id / theo tên / không xác định), gộp dòng cùng chứng từ,
// dư đầu kỳ từ phát sinh trước kỳ, lọc theo 1 khách hàng và kỳ báo cáo sai.
const TAG = 'IT-SREP'
const YEAR = 2026
const PREV = `${YEAR - 1}-11-15`
const D1 = `${YEAR}-06-10`
const D2 = `${YEAR}-06-11`
const RANGE = `fromDate=${YEAR}-06-01&toDate=${YEAR}-06-30`

const KH1 = { code: `${TAG}-KH01`, name: 'Khách Báo Cáo Một' }
const KH2 = { code: `${TAG}-KH02`, name: 'Khách Báo Cáo Hai' }

describe('Sales reports (integration)', () => {
  let app: INestApplication
  let token: string
  let kh1Id: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)
  const get = (url: string) => http().get(url).set('Authorization', auth()).expect(200)

  const sale = (
    date: string,
    customer: { code: string; name: string },
    itemName: string,
    quantity: number,
    unitPrice: number,
    extra: Record<string, unknown> = {},
  ) =>
    post('/api/sales/vouchers', {
      voucherType: 'DOMESTIC_GOODS',
      paymentMode: 'UNPAID',
      postingDate: date,
      voucherDate: date,
      customerId: customer.code,
      customerName: customer.name,
      description: `${TAG} bán hàng`,
      lines: [{ itemName, unit: 'Cái', quantity, unitPrice, ...extra }],
    })

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await post('/api/sales/customers', KH1)
    await post('/api/sales/customers', KH2)
    kh1Id = (await prisma.customer.findUniqueOrThrow({ where: { code: KH1.code } })).id

    // Trước kỳ → chỉ vào dư đầu kỳ của KH1.
    await sale(PREV, KH1, 'Hàng A', 1, 4_000_000)
    // Trong kỳ.
    await sale(D1, KH1, 'Hàng A', 2, 1_000_000, { vatRate: 10 })
    await sale(D1, KH1, 'Hàng B', 1, 500_000, { tradeDiscount: 50_000 })
    await sale(D2, KH2, 'Hàng A', 3, 1_000_000)

    // Phiếu thu tiền mặt ghi Có 131 của KH1 → phát sinh Có trong kỳ.
    await post('/api/cash/vouchers', {
      type: 'RECEIPT',
      category: 'RECEIPT',
      postingDate: D2,
      voucherDate: D2,
      partnerType: 'CUSTOMER',
      partnerId: KH1.code,
      partnerName: KH1.name,
      reason: `${TAG} thu nợ`,
      lines: [{ debitAccount: '1111', creditAccount: '131', amount: 700_000 }],
    })

    // NVK ghi Nợ 131 không gắn đối tượng → nhóm "Không xác định".
    await post('/api/general/vouchers', {
      postingDate: D2,
      voucherDate: D2,
      description: `${TAG} NVK không đối tượng`,
      lines: [{ debitAccount: '131', creditAccount: '511', amount: 300_000 }],
    })
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('sổ chi tiết bán hàng', () => {
    it('mỗi dòng hàng 1 dòng sổ, tổng cộng khớp', async () => {
      const res = await get(`/api/sales/reports/detail?${RANGE}`)
      const rows: {
        voucherNo: string
        itemName: string
        amount: string
        vatAmount: string
        discount: string
        totalPayment: string
      }[] = res.body.rows
      expect(rows).toHaveLength(3) // 3 chứng từ trong kỳ, mỗi chứng từ 1 dòng hàng

      // Tiền hàng: 2tr (đã có VAT riêng) + 450k (đã trừ chiết khấu 50k) + 3tr.
      expect(Number(res.body.totalAmount)).toBe(5_450_000)
      expect(Number(res.body.totalDiscount)).toBe(50_000)
      expect(Number(res.body.totalVat)).toBe(200_000)
      expect(Number(res.body.totalPayment)).toBe(5_650_000)

      const withVat = rows.find((r) => Number(r.vatAmount) > 0)!
      expect(Number(withVat.totalPayment)).toBe(
        Number(withVat.amount) + Number(withVat.vatAmount),
      )
      expect(res.body.fromDate).toBe(`${YEAR}-06-01`)
    })

    it('kỳ không có chứng từ → rỗng, tổng 0', async () => {
      const res = await get('/api/sales/reports/detail?fromDate=2000-01-01&toDate=2000-12-31')
      expect(res.body.rows).toHaveLength(0)
      expect(Number(res.body.totalPayment)).toBe(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/sales/reports/detail?fromDate=${YEAR}-06-30&toDate=${YEAR}-06-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('tổng hợp theo mặt hàng', () => {
    it('gộp theo tên mặt hàng, tổng khớp sổ chi tiết', async () => {
      const res = await get(`/api/sales/reports/by-item?${RANGE}`)
      const rows: { itemName: string; quantity: string; amount: string }[] = res.body.rows
      expect(rows.map((r) => r.itemName)).toEqual(['Hàng A', 'Hàng B'])
      const hangA = rows.find((r) => r.itemName === 'Hàng A')!
      // 2 chứng từ Hàng A: 2 cái + 3 cái.
      expect(Number(hangA.quantity)).toBe(5)
      expect(Number(hangA.amount)).toBe(5_000_000)
      expect(Number(res.body.totalAmount)).toBe(5_450_000)
      // Mặt hàng nhập tay không gắn danh mục → itemId/itemCode null.
      expect(hangA).toMatchObject({ itemId: null, itemCode: null })
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/sales/reports/by-item?fromDate=${YEAR}-06-30&toDate=${YEAR}-06-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('công nợ phải thu — tổng hợp', () => {
    type Row = {
      customerId: string | null
      customerCode: string | null
      customerName: string
      openingBalance: string
      debitAmount: string
      creditAmount: string
      closingBalance: string
    }

    it('dư đầu kỳ từ phát sinh trước kỳ; nhóm không xác định cho dòng thiếu đối tượng', async () => {
      const res = await get(`/api/sales/reports/receivable-summary?${RANGE}`)
      const rows: Row[] = res.body.rows

      const kh1 = rows.find((r) => r.customerCode === KH1.code)!
      expect(Number(kh1.openingBalance)).toBe(4_000_000)
      // Trong kỳ: 2tr + 200k VAT + 450k = 2.65tr ghi Nợ; thu 700k ghi Có.
      expect(Number(kh1.debitAmount)).toBe(2_650_000)
      expect(Number(kh1.creditAmount)).toBe(700_000)
      expect(Number(kh1.closingBalance)).toBe(4_000_000 + 2_650_000 - 700_000)

      const kh2 = rows.find((r) => r.customerCode === KH2.code)!
      expect(Number(kh2.openingBalance)).toBe(0)
      expect(Number(kh2.debitAmount)).toBe(3_000_000)

      const unknown = rows.find((r) => r.customerId === null)!
      expect(unknown.customerName).toBe('Không xác định')
      expect(Number(unknown.debitAmount)).toBe(300_000)

      // Tổng cộng = Σ dòng.
      expect(Number(res.body.totalDebit)).toBe(
        rows.reduce((a, r) => a + Number(r.debitAmount), 0),
      )
      expect(Number(res.body.totalClosing)).toBe(
        rows.reduce((a, r) => a + Number(r.closingBalance), 0),
      )
    })

    it('lọc theo 1 khách hàng → chỉ còn khách đó', async () => {
      const res = await get(`/api/sales/reports/receivable-summary?${RANGE}&customerId=${kh1Id}`)
      const rows: Row[] = res.body.rows
      expect(rows).toHaveLength(1)
      expect(rows[0]!.customerCode).toBe(KH1.code)
    })

    it('customerId không tồn tại → không có dòng nào', async () => {
      const res = await get(
        `/api/sales/reports/receivable-summary?${RANGE}&customerId=khong-co-that`,
      )
      expect(res.body.rows).toHaveLength(0)
      expect(Number(res.body.totalClosing)).toBe(0)
    })
  })

  describe('công nợ phải thu — chi tiết', () => {
    type Group = {
      customerCode: string | null
      openingBalance: string
      closingBalance: string
      rows: {
        voucherNo: string
        source: string
        debitAmount: string
        creditAmount: string
        balance: string
      }[]
    }

    it('mỗi KH 1 nhóm, dòng sắp theo ngày, số dư lũy kế từ dư đầu kỳ', async () => {
      const res = await get(`/api/sales/reports/receivable-detail?${RANGE}`)
      const kh1: Group = res.body.groups.find((g: Group) => g.customerCode === KH1.code)
      expect(kh1).toBeDefined()
      expect(Number(kh1.openingBalance)).toBe(4_000_000)
      // 2 chứng từ bán + 1 phiếu thu (dòng hạch toán cùng chứng từ đã gộp).
      expect(kh1.rows).toHaveLength(3)

      const sources = kh1.rows.map((r) => r.source)
      expect(sources).toContain('SALES')
      expect(sources.some((s) => s !== 'SALES')).toBe(true)

      // Số dư dòng cuối = dư cuối kỳ của nhóm.
      expect(kh1.rows[kh1.rows.length - 1]!.balance).toBe(kh1.closingBalance)
      // Dòng ghi Có (phiếu thu) có debitAmount = 0.
      const credit = kh1.rows.find((r) => Number(r.creditAmount) > 0)!
      expect(Number(credit.debitAmount)).toBe(0)
      expect(Number(credit.creditAmount)).toBe(700_000)
    })

    it('lọc theo 1 khách hàng → chỉ còn nhóm của khách đó', async () => {
      const res = await get(`/api/sales/reports/receivable-detail?${RANGE}&customerId=${kh1Id}`)
      expect(res.body.groups).toHaveLength(1)
      expect(res.body.groups[0].customerCode).toBe(KH1.code)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/sales/reports/receivable-detail?fromDate=${YEAR}-06-30&toDate=${YEAR}-06-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })
})
