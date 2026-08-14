import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// PurchaseReportService mới chỉ có smoke test trên DB rỗng. Đối xứng với
// sales-report: sổ chi tiết mua hàng, tổng hợp theo mặt hàng, tổng hợp + chi
// tiết công nợ 331 (quy đối tượng theo id / theo tên / không xác định, dư đầu
// kỳ từ phát sinh trước kỳ, lọc theo 1 NCC, kỳ báo cáo sai).
const TAG = 'IT-PREP'
const YEAR = 2026
const PREV = `${YEAR - 1}-11-20`
const D1 = `${YEAR}-08-10`
const D2 = `${YEAR}-08-11`
const RANGE = `fromDate=${YEAR}-08-01&toDate=${YEAR}-08-31`

const NCC1 = { code: `${TAG}-NCC01`, name: 'NCC Báo Cáo Một', type: 'ORG' }
const NCC2 = { code: `${TAG}-NCC02`, name: 'NCC Báo Cáo Hai', type: 'ORG' }

describe('Purchase reports (integration)', () => {
  let app: INestApplication
  let token: string
  let ncc1Id: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)
  const get = (url: string) => http().get(url).set('Authorization', auth()).expect(200)

  const buy = (
    date: string,
    supplier: { code: string; name: string },
    itemName: string,
    quantity: number,
    unitPrice: number,
    extra: Record<string, unknown> = {},
  ) =>
    post('/api/purchase/vouchers', {
      type: 'SERVICE',
      paymentMode: 'UNPAID',
      postingDate: date,
      voucherDate: date,
      supplierId: supplier.code,
      supplierName: supplier.name,
      description: `${TAG} mua hàng`,
      lines: [{ itemName, unit: 'Cái', quantity, unitPrice, ...extra }],
    })

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteSuppliersByPrefix(prisma, TAG)
    await post('/api/purchase/suppliers', NCC1)
    await post('/api/purchase/suppliers', NCC2)
    ncc1Id = (await prisma.supplier.findUniqueOrThrow({ where: { code: NCC1.code } })).id

    // Trước kỳ → dư đầu kỳ của NCC1.
    await buy(PREV, NCC1, 'Vật tư A', 1, 3_000_000)
    // Trong kỳ.
    await buy(D1, NCC1, 'Vật tư A', 2, 1_000_000, { vatRate: 10, vatAccount: '1331' })
    await buy(D1, NCC1, 'Vật tư B', 1, 500_000)
    await buy(D2, NCC2, 'Vật tư A', 3, 1_000_000)

    // Phiếu chi tiền mặt ghi Nợ 331 của NCC1 → phát sinh Nợ (trả nợ) trong kỳ.
    await post('/api/cash/vouchers', {
      type: 'PAYMENT',
      category: 'PAYMENT',
      postingDate: D2,
      voucherDate: D2,
      partnerType: 'SUPPLIER',
      partnerId: NCC1.code,
      partnerName: NCC1.name,
      reason: `${TAG} trả nợ NCC`,
      lines: [{ debitAccount: '331', creditAccount: '1111', amount: 800_000 }],
    })

    // Phiếu chi ghi Nợ 331 nhưng không gắn đối tượng → nhóm "Không xác định".
    await post('/api/cash/vouchers', {
      type: 'PAYMENT',
      category: 'PAYMENT',
      postingDate: D2,
      voucherDate: D2,
      reason: `${TAG} trả nợ không đối tượng`,
      lines: [{ debitAccount: '331', creditAccount: '1111', amount: 400_000 }],
    })
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('sổ chi tiết mua hàng', () => {
    it('mỗi dòng hàng 1 dòng sổ, tổng cộng khớp', async () => {
      const res = await get(`/api/purchase/reports/detail?${RANGE}`)
      expect(res.body.rows).toHaveLength(3)
      // 2tr + 500k + 3tr.
      expect(Number(res.body.totalAmount)).toBe(5_500_000)
      expect(Number(res.body.totalVat)).toBe(200_000)
      expect(Number(res.body.totalPayment)).toBe(5_700_000)
    })

    it('kỳ không có chứng từ → rỗng', async () => {
      const res = await get('/api/purchase/reports/detail?fromDate=2000-01-01&toDate=2000-12-31')
      expect(res.body.rows).toHaveLength(0)
      expect(Number(res.body.totalPayment)).toBe(0)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/purchase/reports/detail?fromDate=${YEAR}-08-31&toDate=${YEAR}-08-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  describe('tổng hợp theo mặt hàng', () => {
    it('gộp theo tên mặt hàng', async () => {
      const res = await get(`/api/purchase/reports/by-item?${RANGE}`)
      const rows: { itemName: string; quantity: string; amount: string }[] = res.body.rows
      const vtA = rows.find((r) => r.itemName === 'Vật tư A')!
      expect(Number(vtA.quantity)).toBe(5)
      expect(Number(vtA.amount)).toBe(5_000_000)
      expect(Number(res.body.totalAmount)).toBe(5_500_000)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/purchase/reports/by-item?fromDate=${YEAR}-08-31&toDate=${YEAR}-08-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })

  type Row = {
    supplierId: string | null
    supplierCode: string | null
    supplierName: string
    openingBalance: string
    debitAmount: string
    creditAmount: string
    closingBalance: string
  }

  describe('công nợ phải trả — tổng hợp', () => {
    it('dư đầu kỳ từ phát sinh trước kỳ; nhóm không xác định', async () => {
      const res = await get(`/api/purchase/reports/payable-summary?${RANGE}`)
      const rows: Row[] = res.body.rows

      const ncc1 = rows.find((r) => r.supplierCode === NCC1.code)!
      expect(Number(ncc1.openingBalance)).toBe(3_000_000)
      // Trong kỳ ghi Có: 2tr + 200k VAT + 500k = 2.7tr; ghi Nợ (trả nợ) 800k.
      expect(Number(ncc1.creditAmount)).toBe(2_700_000)
      expect(Number(ncc1.debitAmount)).toBe(800_000)
      expect(Number(ncc1.closingBalance)).toBe(3_000_000 + 2_700_000 - 800_000)

      const ncc2 = rows.find((r) => r.supplierCode === NCC2.code)!
      expect(Number(ncc2.openingBalance)).toBe(0)
      expect(Number(ncc2.creditAmount)).toBe(3_000_000)

      const unknown = rows.find((r) => r.supplierId === null)!
      expect(unknown.supplierName).toBe('Không xác định')
      expect(Number(unknown.debitAmount)).toBe(400_000)

      expect(Number(res.body.totalCredit)).toBe(
        rows.reduce((a, r) => a + Number(r.creditAmount), 0),
      )
    })

    it('lọc theo 1 NCC → chỉ còn NCC đó', async () => {
      const res = await get(`/api/purchase/reports/payable-summary?${RANGE}&supplierId=${ncc1Id}`)
      expect(res.body.rows).toHaveLength(1)
      expect(res.body.rows[0].supplierCode).toBe(NCC1.code)
    })

    it('supplierId không tồn tại → không có dòng nào', async () => {
      const res = await get(
        `/api/purchase/reports/payable-summary?${RANGE}&supplierId=khong-co-that`,
      )
      expect(res.body.rows).toHaveLength(0)
      expect(Number(res.body.totalClosing)).toBe(0)
    })
  })

  describe('công nợ phải trả — chi tiết', () => {
    type Group = Row & {
      rows: { voucherNo: string; source: string; debitAmount: string; creditAmount: string; balance: string }[]
    }

    it('mỗi NCC 1 nhóm, số dư lũy kế từ dư đầu kỳ', async () => {
      const res = await get(`/api/purchase/reports/payable-detail?${RANGE}`)
      const ncc1: Group = res.body.groups.find((g: Group) => g.supplierCode === NCC1.code)
      expect(ncc1).toBeDefined()
      expect(Number(ncc1.openingBalance)).toBe(3_000_000)
      // 2 chứng từ mua + 1 phiếu chi.
      expect(ncc1.rows).toHaveLength(3)
      expect(ncc1.rows[ncc1.rows.length - 1]!.balance).toBe(ncc1.closingBalance)

      const paid = ncc1.rows.find((r) => Number(r.debitAmount) > 0)!
      expect(Number(paid.debitAmount)).toBe(800_000)
      expect(Number(paid.creditAmount)).toBe(0)
    })

    it('lọc theo 1 NCC → chỉ còn nhóm của NCC đó', async () => {
      const res = await get(`/api/purchase/reports/payable-detail?${RANGE}&supplierId=${ncc1Id}`)
      expect(res.body.groups).toHaveLength(1)
      expect(res.body.groups[0].supplierCode).toBe(NCC1.code)
    })

    it('từ ngày > đến ngày → 400', async () => {
      await http()
        .get(`/api/purchase/reports/payable-detail?fromDate=${YEAR}-08-31&toDate=${YEAR}-08-01`)
        .set('Authorization', auth())
        .expect(400)
    })
  })
})
