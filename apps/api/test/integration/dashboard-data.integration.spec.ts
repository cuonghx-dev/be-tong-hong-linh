import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Spec dashboard sẵn có chỉ smoke trên DB rỗng → mọi nhánh "có dữ liệu" của
// DashboardService không chạy. Spec này dựng chứng từ thật rồi assert số liệu:
// kỳ tháng/quý/năm, thu vs chi (tiền mặt + tiền gửi), nợ quá hạn vs trong hạn,
// nhóm chi phí (đủ 6 nhóm kể cả "other"), tồn kho, mặt hàng bán chạy, onboarding.
const TAG = 'IT-DASH'
const CUSTOMER = { code: `${TAG}-KH01`, name: 'Khách Dashboard' }
const SUPPLIER = { code: `${TAG}-NCC01`, name: 'NCC Dashboard', type: 'ORG' }
const ITEM = 'BECHUADAU'
const WAREHOUSE = 'KHO VAT TU'

// Ngày tính theo "hôm nay" để nhánh kỳ tháng/quý/năm luôn có dữ liệu.
const NOW = new Date()
const YEAR = NOW.getUTCFullYear()
const iso = (d: Date) => d.toISOString().slice(0, 10)
const CUR = iso(new Date(Date.UTC(YEAR, NOW.getUTCMonth(), 1))) // đầu tháng hiện tại
const PREV_YEAR = `${YEAR - 1}-06-30`
const PAST = iso(new Date(Date.UTC(YEAR, NOW.getUTCMonth(), 1) - 86_400_000 * 30)) // quá hạn
const FUTURE = iso(new Date(Date.UTC(YEAR + 1, 0, 15)))

describe('Dashboard — số liệu thật (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const get = (url: string) => http().get(url).set('Authorization', auth()).expect(200)
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)

  const cash = (type: 'RECEIPT' | 'PAYMENT', date: string, debit: string, amount: number) =>
    post('/api/cash/vouchers', {
      type,
      category: type,
      postingDate: date,
      voucherDate: date,
      reason: `${TAG} ${type}`,
      lines: [
        type === 'RECEIPT'
          ? { debitAccount: '1111', creditAccount: '711', amount }
          : { debitAccount: debit, creditAccount: '1111', amount },
      ],
    })

  const bank = (type: 'RECEIPT' | 'PAYMENT', date: string, debit: string, amount: number) =>
    post('/api/bank/vouchers', {
      type,
      category: type,
      postingDate: date,
      voucherDate: date,
      bankAccountNo: '113366889999',
      reason: `${TAG} ${type}`,
      lines: [
        type === 'RECEIPT'
          ? { debitAccount: '1121', creditAccount: '711', amount }
          : { debitAccount: debit, creditAccount: '1121', amount },
      ],
    })

  const nvk = (date: string, debitAccount: string, amount: number) =>
    post('/api/general/vouchers', {
      postingDate: date,
      voucherDate: date,
      description: `${TAG} NVK ${debitAccount}`,
      lines: [{ debitAccount, creditAccount: '331', amount }],
    })

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await post('/api/sales/customers', CUSTOMER)
    await post('/api/purchase/suppliers', SUPPLIER)

    // ── Tiền: thu/chi năm trước (số dư đầu năm) + thu/chi trong kỳ ───────────
    await cash('RECEIPT', PREV_YEAR, '', 100_000_000)
    await cash('PAYMENT', PREV_YEAR, '642', 30_000_000)
    await cash('RECEIPT', CUR, '', 20_000_000)
    await cash('PAYMENT', CUR, '642', 5_000_000) // chi phí quản lý DN
    await bank('RECEIPT', CUR, '', 50_000_000)
    await bank('PAYMENT', CUR, '635', 1_000_000) // chi phí tài chính

    // ── Chi phí: giá vốn + khác. Chart of accounts của seed không có 621–627
    // (sản xuất) lẫn 641 (bán hàng) nên 2 nhóm đó không dựng được từ dữ liệu thật.
    await nvk(CUR, '632', 9_000_000) // cogs
    await nvk(CUR, '811', 2_000_000) // other (8xx)
    await nvk(CUR, '611', 1_500_000) // other (6xx ngoài nhóm)
    await nvk(CUR, '6421', 500_000) // admin (substring 3 ký tự → 642)

    // ── Công nợ: 1 hóa đơn quá hạn + 1 còn hạn (mỗi chiều) ───────────────────
    const sale = (dueDate: string, unitPrice: number) => ({
      voucherType: 'DOMESTIC_GOODS',
      paymentMode: 'UNPAID',
      postingDate: CUR,
      voucherDate: CUR,
      dueDate,
      customerId: CUSTOMER.code,
      customerName: CUSTOMER.name,
      description: `${TAG} bán hàng`,
      lines: [{ itemName: 'Hàng dashboard', quantity: 1, unitPrice }],
    })
    await post('/api/sales/vouchers', sale(PAST, 40_000_000)) // quá hạn
    await post('/api/sales/vouchers', sale(FUTURE, 10_000_000)) // còn hạn

    const buy = (dueDate: string, unitPrice: number) => ({
      type: 'SERVICE',
      paymentMode: 'UNPAID',
      postingDate: CUR,
      voucherDate: CUR,
      dueDate,
      supplierId: SUPPLIER.code,
      supplierName: SUPPLIER.name,
      description: `${TAG} mua dịch vụ`,
      lines: [{ itemName: 'Dịch vụ dashboard', quantity: 1, unitPrice }],
    })
    await post('/api/purchase/vouchers', buy(PAST, 6_000_000))
    await post('/api/purchase/vouchers', buy(FUTURE, 4_000_000))

    // ── Kho: nhập 5 − xuất 2 ────────────────────────────────────────────────
    await post('/api/inventory/receipts', {
      receiptType: 'PURCHASE',
      postingDate: CUR,
      voucherDate: CUR,
      description: `${TAG} nhập kho`,
      lines: [
        { itemId: ITEM, itemName: ITEM, warehouseId: WAREHOUSE, quantity: 5, unitPrice: 2_000_000 },
      ],
    })
    await post('/api/inventory/issues', {
      category: 'SALES',
      postingDate: CUR,
      voucherDate: CUR,
      description: `${TAG} xuất kho`,
      lines: [
        { itemId: ITEM, itemName: ITEM, warehouseId: WAREHOUSE, quantity: 2, unitPrice: 2_000_000 },
      ],
    })
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('finance overview', () => {
    it.each(['month', 'quarter', 'year'])('period=%s → có số dư tiền và doanh thu', async (p) => {
      const res = await get(`/api/dashboard/finance?period=${p}`)
      // Tiền mặt: +100tr −30tr +20tr −5tr = 85tr (toàn thời gian, không theo kỳ).
      expect(Number(res.body.cash)).toBe(85_000_000)
      // Tiền gửi: +50tr −1tr = 49tr.
      expect(Number(res.body.bank)).toBe(49_000_000)
      // Doanh thu kỳ hiện tại = 2 hóa đơn bán (40tr + 10tr).
      expect(Number(res.body.revenue)).toBe(50_000_000)
      expect(Number(res.body.expense)).toBeGreaterThan(0)
      expect(Number(res.body.profit)).toBe(
        Number(res.body.revenue) - Number(res.body.expense),
      )
      // Tồn kho = nhập 10tr − xuất 4tr.
      expect(Number(res.body.inventory)).toBe(6_000_000)
      expect(Number(res.body.receivable)).toBe(50_000_000)
      expect(Number(res.body.payable)).toBe(10_000_000)
    })

    it('không truyền period → mặc định tháng, vẫn 200', async () => {
      const res = await get('/api/dashboard/finance')
      expect(Number(res.body.cash)).toBe(85_000_000)
    })
  })

  describe('công nợ theo hạn', () => {
    it('phải thu: tách quá hạn / trong hạn', async () => {
      const res = await get('/api/dashboard/receivable-aging')
      expect(Number(res.body.total)).toBe(50_000_000)
      expect(Number(res.body.overdue)).toBe(40_000_000)
      expect(Number(res.body.current)).toBe(10_000_000)
    })

    it('phải trả: tách quá hạn / trong hạn', async () => {
      const res = await get('/api/dashboard/payable-aging')
      expect(Number(res.body.total)).toBe(10_000_000)
      expect(Number(res.body.overdue)).toBe(6_000_000)
      expect(Number(res.body.current)).toBe(4_000_000)
    })
  })

  it('profit-loss: 12 tháng, tháng hiện tại có doanh thu, tổng khớp', async () => {
    const res = await get(`/api/dashboard/profit-loss?year=${YEAR}`)
    expect(res.body.months).toHaveLength(12)
    const cur = res.body.months[NOW.getUTCMonth()]
    expect(Number(cur.revenue)).toBe(50_000_000)
    expect(Number(cur.expense)).toBeGreaterThan(0)
    expect(Number(cur.profit)).toBe(Number(cur.revenue) - Number(cur.expense))
    expect(Number(res.body.totalRevenue)).toBe(50_000_000)
    expect(Number(res.body.totalProfit)).toBe(
      Number(res.body.totalRevenue) - Number(res.body.totalExpense),
    )
    // Tháng không có phát sinh → 0 (nhánh `?? ZERO`).
    const empty = res.body.months.find(
      (m: { month: number }) => m.month !== NOW.getUTCMonth() + 1,
    )
    expect(empty).toBeDefined()
  })

  it('cashflow: số dư đầu năm từ chứng từ năm trước + thu/chi trong năm', async () => {
    const res = await get(`/api/dashboard/cashflow?year=${YEAR}`)
    expect(res.body.months).toHaveLength(12)
    // Trong năm: thu 20tr + 50tr, chi 5tr + 1tr.
    expect(Number(res.body.totalInflow)).toBe(70_000_000)
    expect(Number(res.body.totalOutflow)).toBe(6_000_000)
    // Đầu năm 100tr − 30tr = 70tr → cuối năm 70 + 70 − 6 = 134tr.
    expect(Number(res.body.balance)).toBe(134_000_000)

    const cur = res.body.months[NOW.getUTCMonth()]
    expect(Number(cur.inflow)).toBe(70_000_000)
    expect(Number(cur.outflow)).toBe(6_000_000)
    // Tháng trước tháng phát sinh giữ nguyên số dư đầu năm.
    if (NOW.getUTCMonth() > 0) {
      expect(Number(res.body.months[NOW.getUTCMonth() - 1].balance)).toBe(70_000_000)
    }
  })

  it('cashflow năm không có chứng từ → toàn 0', async () => {
    const res = await get(`/api/dashboard/cashflow?year=${YEAR - 5}`)
    expect(Number(res.body.totalInflow)).toBe(0)
    expect(Number(res.body.totalOutflow)).toBe(0)
    expect(Number(res.body.balance)).toBe(0)
  })

  it('inventory: tổng giá trị + top mặt hàng, tôn trọng limit', async () => {
    const res = await get('/api/dashboard/inventory?limit=1')
    expect(Number(res.body.totalValue)).toBe(6_000_000)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].itemName).toBe('Bể chứa nhiên liệu 15M3')
    expect(Number(res.body.items[0].quantity)).toBe(3)
    expect(Number(res.body.items[0].value)).toBe(6_000_000)
  })

  it('top-selling: mặt hàng bán chạy trong năm', async () => {
    const res = await get(`/api/dashboard/top-selling?year=${YEAR}&limit=5`)
    expect(Number(res.body.totalRevenue)).toBe(50_000_000)
    expect(res.body.items[0].itemName).toBe('Hàng dashboard')
    expect(Number(res.body.items[0].revenue)).toBe(50_000_000)
    expect(Number(res.body.items[0].quantity)).toBe(2)
  })

  it('top-selling năm khác → không có mặt hàng', async () => {
    const res = await get(`/api/dashboard/top-selling?year=${YEAR - 5}`)
    expect(res.body.items).toHaveLength(0)
    expect(Number(res.body.totalRevenue)).toBe(0)
  })

  it('expenses: gom theo nhóm TK, TK ngoài nhóm rơi vào "other", tổng = Σ nhóm', async () => {
    const res = await get(`/api/dashboard/expenses?year=${YEAR}`)
    const byKey = Object.fromEntries(
      res.body.groups.map((g: { key: string; amount: string }) => [g.key, Number(g.amount)]),
    )
    // 632 = NVK 9tr + phiếu xuất kho bán hàng 4tr (goods_issue_lines cũng vào chi phí).
    expect(byKey.cogs).toBe(13_000_000)
    // 642: phiếu chi tiền mặt 5tr + NVK 6421 0.5tr (substring 3 ký tự gộp chung)
    // + 2 chứng từ mua dịch vụ 6tr/4tr (stock_account của dòng dịch vụ là 642).
    expect(byKey.admin).toBe(15_500_000)
    expect(byKey.finance).toBe(1_000_000) // 635 (ủy nhiệm chi)
    expect(byKey.other).toBe(3_500_000) // 811 (2tr) + 611 (1.5tr)
    // Nhóm phải giữ thứ tự khai báo trong EXPENSE_GROUPS.
    expect(res.body.groups.map((g: { key: string }) => g.key)).toEqual([
      'cogs',
      'admin',
      'finance',
      'other',
    ])
    const sum = Object.values(byKey).reduce((a: number, b) => a + (b as number), 0)
    expect(Number(res.body.total)).toBe(sum)
  })

  it('expenses năm không phát sinh → không có nhóm nào', async () => {
    const res = await get(`/api/dashboard/expenses?year=${YEAR - 5}`)
    expect(res.body.groups).toHaveLength(0)
    expect(Number(res.body.total)).toBe(0)
  })

  it('onboarding: việc đã có chứng từ → true', async () => {
    const res = await get('/api/dashboard/onboarding')
    const t = res.body.tasks
    expect(t.cashReceipt).toBe(true)
    expect(t.cashPayment).toBe(true)
    expect(t.bankReceipt).toBe(true)
    expect(t.bankPayment).toBe(true)
    expect(t.purchaseVoucher).toBe(true)
    expect(t.salesVoucher).toBe(true)
    expect(t.inventoryReceipt).toBe(true)
    expect(t.goodsIssue).toBe(true)
    expect(t.generalVoucher).toBe(true)
    // Danh mục do seed dựng sẵn.
    expect(t.products).toBe(true)
    expect(t.warehouses).toBe(true)
    expect(t.accounts).toBe(true)
    // Seed không khai báo tồn kho đầu kỳ.
    expect(t.inventoryBalances).toBe(false)
  })
})
