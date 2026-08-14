import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Nhánh của ReportService mà spec report chưa chạm: phân trang sổ nhật ký chung,
// sổ chi tiết không lọc TK, dư Có (splitBalance nhánh âm), dư đầu kỳ từ khai báo
// + phát sinh trước kỳ, TK cha chỉ có dư khai báo bị lược, và kỳ báo cáo sai.
const TAG = 'IT-RPTLED'
const YEAR = 2026
const PREV = `${YEAR - 1}-12-20`
const D1 = `${YEAR}-05-10`
const D2 = `${YEAR}-05-11`
const RANGE = `fromDate=${YEAR}-05-01&toDate=${YEAR}-05-31`

const CUSTOMER = { code: `${TAG}-KH01`, name: 'Khách Sổ Cái' }
const SUPPLIER = { code: `${TAG}-NCC01`, name: 'NCC Sổ Cái', type: 'ORG' }

describe('Reports — nhánh sổ nhật ký chung / sổ chi tiết (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)
  const get = (url: string) => http().get(url).set('Authorization', auth()).expect(200)

  const cash = (date: string, debit: string, credit: string, amount: number) =>
    post('/api/cash/vouchers', {
      type: debit.startsWith('111') ? 'RECEIPT' : 'PAYMENT',
      category: debit.startsWith('111') ? 'RECEIPT' : 'PAYMENT',
      postingDate: date,
      voucherDate: date,
      reason: `${TAG} tiền mặt`,
      lines: [{ debitAccount: debit, creditAccount: credit, amount }],
    })

  const nvk = (date: string, debit: string, credit: string, amount: number) =>
    post('/api/general/vouchers', {
      postingDate: date,
      voucherDate: date,
      description: `${TAG} NVK`,
      lines: [{ debitAccount: debit, creditAccount: credit, amount }],
    })

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await post('/api/sales/customers', CUSTOMER)
    await post('/api/purchase/suppliers', SUPPLIER)

    // Phát sinh trước kỳ → chỉ vào dư đầu kỳ, không lên dòng của kỳ.
    await cash(PREV, '1111', '711', 10_000_000)
    // Trong kỳ: 3 chứng từ khác loại để sổ nhật ký chung có ≥ 3 nhóm.
    await cash(D1, '1111', '711', 1_000_000)
    await cash(D1, '642', '1111', 400_000)
    await nvk(D2, '632', '331', 2_000_000) // 331 dư Có
    await post('/api/purchase/vouchers', {
      type: 'SERVICE',
      paymentMode: 'UNPAID',
      postingDate: D2,
      voucherDate: D2,
      supplierId: SUPPLIER.code,
      supplierName: SUPPLIER.name,
      description: `${TAG} mua dịch vụ`,
      lines: [{ itemName: 'Dịch vụ', quantity: 1, unitPrice: 3_000_000 }],
    })
    await post('/api/sales/vouchers', {
      voucherType: 'DOMESTIC_GOODS',
      paymentMode: 'UNPAID',
      postingDate: D2,
      voucherDate: D2,
      customerId: CUSTOMER.code,
      customerName: CUSTOMER.name,
      description: `${TAG} bán hàng`,
      lines: [{ itemName: 'Hàng', quantity: 1, unitPrice: 5_000_000 }],
    })
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('sổ nhật ký chung', () => {
    it('mặc định page=1, pageSize=20; tổng Nợ = tổng Có', async () => {
      const res = await get(`/api/reports/general-journal?${RANGE}`)
      expect(res.body.page).toBe(1)
      expect(res.body.pageSize).toBe(20)
      expect(res.body.totalVouchers).toBeGreaterThanOrEqual(5)
      expect(res.body.totalDebit).toBe(res.body.totalCredit)
      // Mỗi bút toán tách 2 dòng (vế Nợ rồi vế Có).
      expect(res.body.vouchers[0].rows.length % 2).toBe(0)
      // Nhãn loại chứng từ đã dịch sang tiếng Việt.
      const kinds: string[] = res.body.vouchers.map((v: { voucherKind: string }) => v.voucherKind)
      expect(kinds).toContain('Phiếu thu')
      expect(kinds).toContain('Chứng từ nghiệp vụ khác')
    })

    it('phân trang cắt theo chứng từ, tổng không đổi', async () => {
      const all = await get(`/api/reports/general-journal?${RANGE}`)
      const p1 = await get(`/api/reports/general-journal?${RANGE}&page=1&pageSize=2`)
      const p2 = await get(`/api/reports/general-journal?${RANGE}&page=2&pageSize=2`)

      expect(p1.body.pageSize).toBe(2)
      expect(p1.body.vouchers).toHaveLength(2)
      expect(p1.body.totalVouchers).toBe(all.body.totalVouchers)
      expect(p1.body.totalDebit).toBe(all.body.totalDebit)
      // Trang 2 khác trang 1.
      expect(p2.body.vouchers[0].voucherNo).not.toBe(p1.body.vouchers[0].voucherNo)
    })

    it('trang vượt số chứng từ → danh sách rỗng nhưng tổng vẫn đúng', async () => {
      const res = await get(`/api/reports/general-journal?${RANGE}&page=99&pageSize=20`)
      expect(res.body.vouchers).toHaveLength(0)
      expect(res.body.totalVouchers).toBeGreaterThan(0)
    })

    it('kỳ không có chứng từ → rỗng, tổng 0', async () => {
      const res = await get('/api/reports/general-journal?fromDate=2000-01-01&toDate=2000-12-31')
      expect(res.body.vouchers).toHaveLength(0)
      expect(res.body.totalVouchers).toBe(0)
      expect(res.body.totalDebit).toBe('0')
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/reports/general-journal?fromDate=${YEAR}-05-31&toDate=${YEAR}-05-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('sổ chi tiết các tài khoản', () => {
    type Section = {
      accountCode: string
      accountName: string | null
      openingDebit: string
      openingCredit: string
      closingDebit: string
      closingCredit: string
      totalDebit: string
      totalCredit: string
      rows: { counterAccount: string; debitAmount: string; creditAmount: string }[]
    }

    it('không truyền accountCode → mọi TK có số dư hoặc phát sinh', async () => {
      const res = await get(`/api/reports/account-ledger?${RANGE}`)
      const codes: string[] = res.body.sections.map((s: Section) => s.accountCode)
      expect(codes).toContain('1111')
      expect(codes).toContain('331')
      expect(codes).toContain('632')
      // Sắp xếp tăng dần theo mã TK.
      expect([...codes].sort()).toEqual(codes)
      // Không có TK rỗng (dòng import chưa định khoản).
      expect(codes).not.toContain('')
    })

    it('TK 1111: dư đầu kỳ từ phát sinh trước kỳ, dư cuối = đầu + Nợ − Có', async () => {
      const res = await get(`/api/reports/account-ledger?${RANGE}&accountCode=1111`)
      const s: Section = res.body.sections.find((x: Section) => x.accountCode === '1111')
      expect(s).toBeDefined()
      // Phiếu thu 10tr trước kỳ (cộng số dư khai báo của seed nếu có).
      expect(Number(s.openingDebit)).toBeGreaterThanOrEqual(10_000_000)
      expect(Number(s.openingCredit)).toBe(0)
      expect(Number(s.totalDebit)).toBe(1_000_000)
      expect(Number(s.totalCredit)).toBe(400_000)
      expect(Number(s.closingDebit)).toBe(
        Number(s.openingDebit) + 1_000_000 - 400_000,
      )
      // TK đối ứng lấy vế còn lại của bút toán.
      expect(s.rows.map((r) => r.counterAccount).sort()).toEqual(['642', '711'])
      expect(s.accountName).not.toBeNull()
    })

    it('TK 331 dư Có → số dư ghi vào cột Có, cột Nợ = 0', async () => {
      const res = await get(`/api/reports/account-ledger?${RANGE}&accountCode=331`)
      const s: Section = res.body.sections.find((x: Section) => x.accountCode === '331')
      expect(s).toBeDefined()
      expect(Number(s.closingDebit)).toBe(0)
      // NVK 2tr + mua dịch vụ 3tr (chưa thanh toán).
      expect(Number(s.closingCredit)).toBeGreaterThanOrEqual(5_000_000)
      expect(Number(s.totalCredit)).toBeGreaterThanOrEqual(5_000_000)
    })

    it('lọc theo prefix → chỉ TK bắt đầu bằng mã đó', async () => {
      const res = await get(`/api/reports/account-ledger?${RANGE}&accountCode=11`)
      const codes: string[] = res.body.sections.map((s: Section) => s.accountCode)
      expect(codes.length).toBeGreaterThan(0)
      expect(codes.every((c) => c.startsWith('11'))).toBe(true)
    })

    it('mã TK không tồn tại → không có section nào', async () => {
      const res = await get(`/api/reports/account-ledger?${RANGE}&accountCode=99999`)
      expect(res.body.sections).toHaveLength(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/reports/account-ledger?fromDate=${YEAR}-05-31&toDate=${YEAR}-05-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })
})
