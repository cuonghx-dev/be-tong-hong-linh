import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-OB'

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Import số dư đầu kỳ (công nợ/tiền gửi/TSCĐ/tồn kho). Import đồng bộ lại số dư
// TK trong account_opening_balances → snapshot cả 5 bảng số dư và khôi phục
// trong afterAll để không lây sang spec khác (pattern như opening-balance spec).
describe('Opening balance import xlsx (integration)', () => {
  let app: INestApplication
  let token: string
  let snapshot: {
    accounts: unknown[]
    partners: unknown[]
    bankAccounts: unknown[]
    fixedAssets: unknown[]
    inventory: unknown[]
  }

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    snapshot = {
      accounts: await prisma.accountOpeningBalance.findMany(),
      partners: await prisma.partnerOpeningBalance.findMany(),
      bankAccounts: await prisma.bankAccountOpeningBalance.findMany(),
      fixedAssets: await prisma.fixedAssetOpeningBalance.findMany(),
      inventory: await prisma.inventoryOpeningBalance.findMany(),
    }
    // Seed betonghonglinh không có danh mục KH/NCC/TK ngân hàng → tạo dữ liệu riêng.
    await prisma.customer.createMany({
      data: [1, 2, 3].map((i) => ({ code: `${TAG}-KH-${i}`, name: `KH đầu kỳ IT ${i}` })),
    })
    await prisma.supplier.createMany({
      data: [1, 2].map((i) => ({ code: `${TAG}-NCC-${i}`, name: `NCC đầu kỳ IT ${i}` })),
    })
    await prisma.bankAccount.createMany({
      data: [1, 2].map((i) => ({ accountNumber: `ITOB000${i}`, bankName: `Ngân hàng IT ${i}` })),
    })
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await prisma.partnerOpeningBalance.deleteMany()
    await prisma.bankAccountOpeningBalance.deleteMany()
    await prisma.fixedAssetOpeningBalance.deleteMany()
    await prisma.inventoryOpeningBalance.deleteMany()
    await prisma.accountOpeningBalance.deleteMany()
    if (snapshot.accounts.length)
      await prisma.accountOpeningBalance.createMany({ data: snapshot.accounts as never })
    if (snapshot.partners.length)
      await prisma.partnerOpeningBalance.createMany({ data: snapshot.partners as never })
    if (snapshot.bankAccounts.length)
      await prisma.bankAccountOpeningBalance.createMany({ data: snapshot.bankAccounts as never })
    if (snapshot.fixedAssets.length)
      await prisma.fixedAssetOpeningBalance.createMany({ data: snapshot.fixedAssets as never })
    if (snapshot.inventory.length)
      await prisma.inventoryOpeningBalance.createMany({ data: snapshot.inventory as never })
    await prisma.customer.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.supplier.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.bankAccount.deleteMany({ where: { accountNumber: { startsWith: 'ITOB' } } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe.each([
    '/api/opening-balance/accounts/import',
    '/api/opening-balance/bank-accounts/import?accountCode=1121',
    '/api/opening-balance/fixed-assets/import',
    '/api/opening-balance/inventory/import',
  ])('POST %s', (route) => {
    it('thiếu file → 400 "Thiếu file Excel"', async () => {
      const res = await http().post(route).set('Authorization', auth()).expect(400)
      expect(res.body.message).toBe('Thiếu file Excel')
    })
  })

  describe('POST /api/opening-balance/partners/import (131 — cột "Số còn phải thu")', () => {
    it('số dương → Dư Nợ, số âm → Dư Có; mã lạ + số 0 skipped; footer "Tổng" bị loại', async () => {
      const buffer = buildXlsx([
        ['Mã khách hàng', 'Số còn phải thu'],
        [`${TAG}-KH-1`, 5000000],
        // KH trả trước → dư ngược vế (Dư Có).
        [`${TAG}-KH-2`, -2000000],
        [`${TAG}-KHONGCO`, 1000000],
        [`${TAG}-KH-3`, 0],
        ['Tổng cộng', 4000000],
      ])

      const res = await http()
        .post('/api/opening-balance/partners/import?accountCode=131')
        .set('Authorization', auth())
        .attach('file', buffer, 'cong-no-kh-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 4, created: 2, skipped: 2 })

      const list = await http()
        .get('/api/opening-balance/partners?accountCode=131')
        .set('Authorization', auth())
        .expect(200)
      const byCode = new Map(
        list.body.items.map((i: { partnerCode: string }) => [i.partnerCode, i]),
      )
      expect(byCode.get(`${TAG}-KH-1`)).toMatchObject({
        debitAmount: '5000000',
        creditAmount: '0',
      })
      expect(byCode.get(`${TAG}-KH-2`)).toMatchObject({
        debitAmount: '0',
        creditAmount: '2000000',
      })

      // Nhập lại chính file → đối tượng đã có số dư bị bỏ qua hết.
      const again = await http()
        .post('/api/opening-balance/partners/import?accountCode=131')
        .set('Authorization', auth())
        .attach('file', buffer, 'cong-no-kh-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 4, created: 0, skipped: 4 })
    })
  })

  describe('POST /api/opening-balance/partners/import (331 — cột tách Dư Nợ/Dư Có)', () => {
    it('ghi thẳng 2 vế theo file, không đoán vế theo loại đối tượng', async () => {
      const buffer = buildXlsx([
        ['Mã nhà cung cấp', 'Dư Nợ', 'Dư Có'],
        // Trả thừa NCC → Dư Nợ.
        [`${TAG}-NCC-1`, 3000000, 0],
        [`${TAG}-NCC-2`, 0, 7000000],
      ])

      const res = await http()
        .post('/api/opening-balance/partners/import?accountCode=331')
        .set('Authorization', auth())
        .attach('file', buffer, 'cong-no-ncc-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const list = await http()
        .get('/api/opening-balance/partners?accountCode=331')
        .set('Authorization', auth())
        .expect(200)
      const byCode = new Map(
        list.body.items.map((i: { partnerCode: string }) => [i.partnerCode, i]),
      )
      expect(byCode.get(`${TAG}-NCC-1`)).toMatchObject({
        debitAmount: '3000000',
        creditAmount: '0',
      })
      expect(byCode.get(`${TAG}-NCC-2`)).toMatchObject({
        debitAmount: '0',
        creditAmount: '7000000',
      })
    })
  })

  describe('POST /api/opening-balance/bank-accounts/import', () => {
    it('cột tách Dư Nợ/Dư Có: số TK lạ + dòng 0/0 skipped', async () => {
      const buffer = buildXlsx([
        ['Số TK ngân hàng', 'Dư Nợ', 'Dư Có'],
        ['ITOB0001', 8000000, 0],
        ['ITOB9999', 1000000, 0],
        ['ITOB0002', 0, 0],
      ])

      const res = await http()
        .post('/api/opening-balance/bank-accounts/import?accountCode=1121')
        .set('Authorization', auth())
        .attach('file', buffer, 'tien-gui-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 1, skipped: 2 })

      const list = await http()
        .get('/api/opening-balance/bank-accounts?accountCode=1121')
        .set('Authorization', auth())
        .expect(200)
      const row = list.body.items.find(
        (i: { accountNumber: string }) => i.accountNumber === 'ITOB0001',
      )
      expect(row).toMatchObject({ debitAmount: '8000000', creditAmount: '0' })
    })

    it('cột số dư gộp: dương → Dư Nợ, âm → Dư Có', async () => {
      const buffer = buildXlsx([
        ['Số tài khoản', 'Số dư'],
        ['ITOB0001', 6000000],
        ['ITOB0002', -4000000],
      ])

      const res = await http()
        .post('/api/opening-balance/bank-accounts/import?accountCode=1122')
        .set('Authorization', auth())
        .attach('file', buffer, 'tien-gui-gop-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const list = await http()
        .get('/api/opening-balance/bank-accounts?accountCode=1122')
        .set('Authorization', auth())
        .expect(200)
      const byNumber = new Map(
        list.body.items.map((i: { accountNumber: string }) => [i.accountNumber, i]),
      )
      expect(byNumber.get('ITOB0001')).toMatchObject({
        debitAmount: '6000000',
        creditAmount: '0',
      })
      expect(byNumber.get('ITOB0002')).toMatchObject({
        debitAmount: '0',
        creditAmount: '4000000',
      })
    })
  })

  describe('POST /api/opening-balance/fixed-assets/import', () => {
    const HEADER = [
      'Mã tài sản',
      'Tên tài sản',
      'Loại tài sản',
      'Đơn vị sử dụng',
      'Nguyên giá',
      'Giá trị tính KH',
      'Hao mòn lũy kế',
      'Ngày ghi tăng',
      'Ngày tính KH',
      'Thời gian SD (tháng)',
      'Thời gian SD còn lại (tháng)',
      'TK nguyên giá',
      'TK khấu hao',
    ]

    it('tạo TSCĐ, thiếu Ngày tính KH → dùng Ngày ghi tăng; footer "Tổng" bị loại', async () => {
      const buffer = buildXlsx([
        HEADER,
        [`${TAG}-TS1`, 'Máy trộn IT', 'Máy móc thiết bị', 'Xưởng', 120000000, 120000000, 20000000, '2025-01-15', '2025-02-01', 60, 50, '2112', '2141'],
        // Không có Ngày tính KH → fallback = Ngày ghi tăng.
        [`${TAG}-TS2`, 'Xe tải IT', 'Phương tiện vận tải', 'Đội xe', 500000000, 500000000, 0, '2025-06-30', null, 96, 96, '2113', '2141'],
        // Trùng trong chính file → bị khử.
        [`${TAG}-TS1`, 'Máy trộn IT (trùng)', 'Máy móc thiết bị', 'Xưởng', 120000000, 120000000, 20000000, '2025-01-15', null, 60, 50, '2112', '2141'],
        // Footer MISA: không có tên tài sản → parser bỏ qua (không tính vào total).
        ['Tổng', null, null, null, 620000000, null, null, null, null, null, null, null, null],
      ])

      const res = await http()
        .post('/api/opening-balance/fixed-assets/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tscd-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const list = await http()
        .get('/api/opening-balance/fixed-assets')
        .set('Authorization', auth())
        .expect(200)
      const byCode = new Map(list.body.map((r: { code: string }) => [r.code, r]))
      expect(byCode.get(`${TAG}-TS1`)).toMatchObject({
        originalCost: '120000000',
        accumulatedDepreciation: '20000000',
        assetAccount: '2112',
      })
      const ts2 = byCode.get(`${TAG}-TS2`) as { acquisitionDate: string; depreciationDate: string }
      expect(ts2.depreciationDate).toBe(ts2.acquisitionDate)

      // Nhập lại → mã đã tồn tại bị bỏ qua hết.
      const again = await http()
        .post('/api/opening-balance/fixed-assets/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tscd-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })
    })
  })

  describe('POST /api/opening-balance/inventory/import', () => {
    it('mã hàng lạ + dòng 0/0 skipped; thiếu Mã kho → dùng kho ngầm định của VTHH', async () => {
      const prisma = prismaOf(app)
      // Seed có 542 VTHH theo dõi tồn kho — lấy 2 mã thật.
      const products = await prisma.product.findMany({
        where: { type: { not: 'SERVICE' } },
        orderBy: { code: 'asc' },
        take: 2,
        select: { id: true, code: true, defaultWarehouseCode: true },
      })
      expect(products).toHaveLength(2)
      const [p0, p1] = products

      const buffer = buildXlsx([
        ['Mã hàng', 'Mã kho', 'Số lượng tồn', 'Giá trị tồn'],
        [p0!.code, 'KHOIT', 10, 5000000],
        // Không có Mã kho → kho ngầm định của VTHH (hoặc rỗng).
        [p1!.code, null, 3, 900000],
        [`${TAG}-KHONGCO`, 'KHOIT', 1, 100],
        [p0!.code, 'KHOIT2', 0, 0],
      ])

      const res = await http()
        .post('/api/opening-balance/inventory/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ton-kho-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 4, created: 2, skipped: 2 })

      const row0 = await prisma.inventoryOpeningBalance.findFirst({
        where: { productId: p0!.id, warehouseCode: 'KHOIT' },
      })
      expect(row0?.quantity.toString()).toBe('10')
      expect(row0?.amount.toString()).toBe('5000000')
      const row1 = await prisma.inventoryOpeningBalance.findFirst({
        where: { productId: p1!.id },
      })
      expect(row1?.warehouseCode).toBe(p1!.defaultWarehouseCode ?? '')

      // Nhập lại → VTHH+kho đã có số tồn bị bỏ qua hết.
      const again = await http()
        .post('/api/opening-balance/inventory/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ton-kho-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 4, created: 0, skipped: 4 })
    })
  })

  describe('khóa sổ chặn nhập số dư đầu kỳ', () => {
    it('đã khóa sổ → import trả 400 "Đã khóa sổ..."', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: '2026-01-31' })
        .expect(200)
      try {
        const buffer = buildXlsx([
          ['Mã khách hàng', 'Số còn phải thu'],
          [`${TAG}-KH-3`, 1000000],
        ])
        const res = await http()
          .post('/api/opening-balance/partners/import?accountCode=131')
          .set('Authorization', auth())
          .attach('file', buffer, 'khoa-so-it.xlsx')
          .expect(400)
        expect(res.body.message).toMatch(/Đã khóa sổ/)
      } finally {
        await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
      }
    })
  })
})
