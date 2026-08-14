import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// BankReportService mới chỉ có smoke test trên DB rỗng. Spec này dựng chứng từ
// thật để phủ các nhánh: gom theo TKNH, dư đầu kỳ từ phát sinh trước kỳ, chuyển
// tiền nội bộ (1 chứng từ sinh cả vế thu lẫn vế chi ở 2 TKNH), gửi tiền từ phiếu
// chi tiền mặt (nguồn CASH), lọc theo TKNH, và bảng kê số dư theo ngày.
const TAG = 'IT-BREP'
const YEAR = 2026
const PREV = `${YEAR - 1}-12-15`
const D1 = `${YEAR}-04-10`
const D2 = `${YEAR}-04-12`
const RANGE = `fromDate=${YEAR}-04-01&toDate=${YEAR}-04-30`

const ACC_A = { accountNumber: `${TAG}-1111222233`, bankName: 'Ngân hàng A', bankBranch: 'CN 1' }
const ACC_B = { accountNumber: `${TAG}-4444555566`, bankName: 'Ngân hàng B' }

describe('Bank reports (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)
  const get = (url: string) => http().get(url).set('Authorization', auth()).expect(200)

  const bank = (
    type: 'RECEIPT' | 'PAYMENT',
    date: string,
    accountNo: string,
    amount: number,
  ) =>
    post('/api/bank/vouchers', {
      type,
      category: type,
      postingDate: date,
      voucherDate: date,
      bankAccountNo: accountNo,
      reason: `${TAG} ${type}`,
      lines: [
        type === 'RECEIPT'
          ? { debitAccount: '1121', creditAccount: '711', amount }
          : { debitAccount: '642', creditAccount: '1121', amount },
      ],
    })

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await prisma.bankAccount.deleteMany({ where: { accountNumber: { startsWith: TAG } } })
    await post('/api/catalog/bank-accounts', ACC_A)
    await post('/api/catalog/bank-accounts', ACC_B)

    // Trước kỳ → dư đầu kỳ của TK A.
    await bank('RECEIPT', PREV, ACC_A.accountNumber, 100_000_000)
    // Trong kỳ trên TK A.
    await bank('RECEIPT', D1, ACC_A.accountNumber, 20_000_000)
    await bank('PAYMENT', D1, ACC_A.accountNumber, 5_000_000)
    // Chuyển tiền nội bộ A → B: 1 chứng từ, 2 vế ở 2 TKNH.
    await post('/api/bank/vouchers', {
      type: 'TRANSFER',
      category: 'PAYMENT',
      postingDate: D2,
      voucherDate: D2,
      bankAccountNo: ACC_A.accountNumber,
      receiverAccountNo: ACC_B.accountNumber,
      receiverBankName: ACC_B.bankName,
      reason: `${TAG} chuyển tiền nội bộ`,
      lines: [{ debitAccount: '1121', creditAccount: '1121', amount: 3_000_000 }],
    })
    // Gửi tiền vào ngân hàng từ phiếu chi tiền mặt → dòng nguồn CASH.
    await post('/api/cash/vouchers', {
      type: 'PAYMENT',
      category: 'DEPOSIT_TO_BANK',
      postingDate: D2,
      voucherDate: D2,
      reason: `${TAG} gửi tiền vào NH`,
      lines: [
        {
          debitAccount: '1121',
          creditAccount: '1111',
          amount: 8_000_000,
          bankAccountNo: ACC_A.accountNumber,
        },
      ],
    })
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await prisma.bankAccount.deleteMany({ where: { accountNumber: { startsWith: TAG } } })
    await app.close()
  })

  type Section = {
    bankAccountNo: string
    bankName: string | null
    openingBalance: string
    totalReceipt: string
    totalPayment: string
    closingBalance: string
    rows: {
      voucherSource: string
      voucherType: string
      receiptAmount: string
      paymentAmount: string
      balance: string
      counterAccount: string
    }[]
  }

  describe('sổ tiền gửi ngân hàng', () => {
    it('gom theo TKNH: dư đầu kỳ, phát sinh thu/chi, dư lũy kế', async () => {
      const res = await get(`/api/bank/reports/bank-book?${RANGE}`)
      const sections: Section[] = res.body.sections
      const a = sections.find((s) => s.bankAccountNo === ACC_A.accountNumber)!
      expect(a).toBeDefined()
      expect(a.bankName).toBe(ACC_A.bankName)
      expect(Number(a.openingBalance)).toBe(100_000_000)
      // Thu: 20tr + 8tr (gửi tiền từ phiếu chi TM). Chi: 5tr + 3tr (chuyển đi).
      expect(Number(a.totalReceipt)).toBe(28_000_000)
      expect(Number(a.totalPayment)).toBe(8_000_000)
      expect(Number(a.closingBalance)).toBe(120_000_000)
      // Số dư dòng cuối = dư cuối kỳ.
      expect(a.rows[a.rows.length - 1]!.balance).toBe(a.closingBalance)
      // Có cả dòng từ chứng từ tiền gửi lẫn dòng từ phiếu chi tiền mặt.
      expect(a.rows.map((r) => r.voucherSource)).toContain('BANK')
      expect(a.rows.map((r) => r.voucherSource)).toContain('CASH')
    })

    it('chuyển tiền nội bộ: vế thu nằm ở TK nhận, vế chi ở TK chuyển', async () => {
      const res = await get(`/api/bank/reports/bank-book?${RANGE}`)
      const sections: Section[] = res.body.sections
      const b = sections.find((s) => s.bankAccountNo === ACC_B.accountNumber)!
      expect(b).toBeDefined()
      expect(Number(b.totalReceipt)).toBe(3_000_000)
      expect(Number(b.totalPayment)).toBe(0)
      expect(Number(b.closingBalance)).toBe(3_000_000)
      expect(b.rows.map((r) => r.voucherType)).toContain('TRANSFER')
    })

    it('lọc theo TKNH → chỉ 1 section', async () => {
      const res = await get(
        `/api/bank/reports/bank-book?${RANGE}&bankAccountNo=${encodeURIComponent(ACC_B.accountNumber)}`,
      )
      const sections: Section[] = res.body.sections
      expect(sections).toHaveLength(1)
      expect(sections[0]!.bankAccountNo).toBe(ACC_B.accountNumber)
    })

    it('lọc TKNH không tồn tại → không có section', async () => {
      const res = await get(`/api/bank/reports/bank-book?${RANGE}&bankAccountNo=${TAG}-khong-co`)
      expect(res.body.sections).toHaveLength(0)
    })

    it('kỳ không phát sinh → chỉ còn TKNH có dư đầu kỳ', async () => {
      const res = await get('/api/bank/reports/bank-book?fromDate=2000-01-01&toDate=2000-12-31')
      const sections: Section[] = res.body.sections
      // Mọi phát sinh đều sau năm 2000 → không TKNH nào có dư lẫn phát sinh.
      expect(sections.filter((s) => s.bankAccountNo.startsWith(TAG))).toHaveLength(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/bank/reports/bank-book?fromDate=${YEAR}-04-30&toDate=${YEAR}-04-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('bảng kê số dư ngân hàng', () => {
    it('mỗi TKNH trong danh mục 1 dòng, tổng = Σ số dư', async () => {
      const res = await get(`/api/bank/reports/account-balances?toDate=${YEAR}-12-31`)
      const rows: { bankAccountNo: string; bankName: string | null; bankBranch: string | null; balance: string }[] =
        res.body.rows

      const a = rows.find((r) => r.bankAccountNo === ACC_A.accountNumber)!
      expect(Number(a.balance)).toBe(120_000_000)
      expect(a.bankBranch).toBe(ACC_A.bankBranch)

      const b = rows.find((r) => r.bankAccountNo === ACC_B.accountNumber)!
      expect(Number(b.balance)).toBe(3_000_000)
      expect(b.bankBranch).toBeNull()

      expect(Number(res.body.totalBalance)).toBe(
        rows.reduce((sum, r) => sum + Number(r.balance), 0),
      )
    })

    it('mốc trước mọi phát sinh → TKNH danh mục vẫn hiện với số dư 0', async () => {
      const res = await get('/api/bank/reports/account-balances?toDate=2000-12-31')
      const rows: { bankAccountNo: string; balance: string }[] = res.body.rows
      const a = rows.find((r) => r.bankAccountNo === ACC_A.accountNumber)!
      expect(Number(a.balance)).toBe(0)
    })
  })

  describe('bảng kê số dư tiền theo ngày', () => {
    it('chỉ ngày có phát sinh, số dư nối tiếp nhau', async () => {
      const res = await get(`/api/bank/reports/daily-balance?${RANGE}`)
      const rows: {
        date: string
        openingBalance: string
        receiptAmount: string
        paymentAmount: string
        closingBalance: string
      }[] = res.body.rows

      expect(rows.map((r) => r.date)).toEqual([D1, D2])
      // Dư đầu kỳ = phát sinh trước kỳ (100tr thu năm trước).
      expect(Number(res.body.openingBalance)).toBe(100_000_000)
      expect(Number(rows[0]!.openingBalance)).toBe(100_000_000)
      expect(Number(rows[0]!.receiptAmount)).toBe(20_000_000)
      expect(Number(rows[0]!.paymentAmount)).toBe(5_000_000)
      expect(Number(rows[0]!.closingBalance)).toBe(115_000_000)
      // Ngày sau nối tiếp số dư ngày trước.
      expect(rows[1]!.openingBalance).toBe(rows[0]!.closingBalance)
      expect(res.body.closingBalance).toBe(rows[1]!.closingBalance)
      expect(Number(res.body.totalReceipt)).toBe(
        rows.reduce((s, r) => s + Number(r.receiptAmount), 0),
      )
    })

    it('kỳ không phát sinh → rỗng, dư đầu = dư cuối', async () => {
      const res = await get('/api/bank/reports/daily-balance?fromDate=2000-01-01&toDate=2000-12-31')
      expect(res.body.rows).toHaveLength(0)
      expect(res.body.openingBalance).toBe(res.body.closingBalance)
      expect(Number(res.body.totalReceipt)).toBe(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/bank/reports/daily-balance?fromDate=${YEAR}-04-30&toDate=${YEAR}-04-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })
})
