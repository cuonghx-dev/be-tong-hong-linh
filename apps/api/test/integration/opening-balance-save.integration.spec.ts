import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { clearBookLock, deleteCustomersByPrefix, deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-OBS'

// Số dư đầu kỳ là dữ liệu seed toàn cục và mọi endpoint PUT đều "thay toàn bộ"
// → snapshot 5 bảng liên quan trước và khôi phục sau để không lây sang spec khác.
describe('Opening balance — lưu bảng + nhánh lỗi (integration)', () => {
  let app: INestApplication
  let token: string
  let customerId: string
  let supplierId: string
  let bankAccountId: string

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
    await clearBookLock(prisma)

    snapshot = {
      accounts: await prisma.accountOpeningBalance.findMany(),
      partners: await prisma.partnerOpeningBalance.findMany(),
      bankAccounts: await prisma.bankAccountOpeningBalance.findMany(),
      fixedAssets: await prisma.fixedAssetOpeningBalance.findMany(),
      inventory: await prisma.inventoryOpeningBalance.findMany(),
    }

    const http = request(app.getHttpServer())
    const auth = `Bearer ${token}`
    const customer = await http
      .post('/api/sales/customers')
      .set('Authorization', auth)
      .send({ code: `${TAG}-KH`, name: `${TAG} Khách hàng số dư` })
      .expect(201)
    customerId = customer.body.id
    const supplier = await request(app.getHttpServer())
      .post('/api/purchase/suppliers')
      .set('Authorization', auth)
      .send({ code: `${TAG}-NCC`, name: `${TAG} NCC số dư`, type: 'ORG' })
      .expect(201)
    supplierId = supplier.body.id
    const bankAccount = await request(app.getHttpServer())
      .post('/api/catalog/bank-accounts')
      .set('Authorization', auth)
      .send({ accountNumber: `${TAG}-8888`, bankName: `${TAG} Bank` })
      .expect(201)
    bankAccountId = bankAccount.body.id
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    // Xóa theo thứ tự chi tiết → tổng, rồi nạp lại snapshot.
    await prisma.partnerOpeningBalance.deleteMany()
    await prisma.bankAccountOpeningBalance.deleteMany()
    await prisma.fixedAssetOpeningBalance.deleteMany()
    await prisma.inventoryOpeningBalance.deleteMany()
    await prisma.accountOpeningBalance.deleteMany()

    const restore = async (
      rows: unknown[],
      create: (data: never) => Promise<unknown>,
    ): Promise<void> => {
      if (rows.length > 0) await create(rows as never)
    }
    await restore(snapshot.accounts, (data) =>
      prisma.accountOpeningBalance.createMany({ data }),
    )
    await restore(snapshot.partners, (data) =>
      prisma.partnerOpeningBalance.createMany({ data }),
    )
    await restore(snapshot.bankAccounts, (data) =>
      prisma.bankAccountOpeningBalance.createMany({ data }),
    )
    await restore(snapshot.fixedAssets, (data) =>
      prisma.fixedAssetOpeningBalance.createMany({ data }),
    )
    await restore(snapshot.inventory, (data) =>
      prisma.inventoryOpeningBalance.createMany({ data }),
    )

    await prisma.bankAccount.deleteMany({ where: { accountNumber: { startsWith: TAG } } })
    await deleteCustomersByPrefix(prisma, TAG)
    await deleteSuppliersByPrefix(prisma, TAG)
    await clearBookLock(prisma)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('PUT accounts — thay toàn bộ bảng số dư tài khoản', () => {
    it('nhập cả 2 vế Nợ và Có cho 1 TK → 400', async () => {
      const res = await http()
        .put('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .send({
          items: [
            { accountCode: '1111', accountName: 'Tiền mặt', debitAmount: 100, creditAmount: 100 },
          ],
        })
        .expect(400)
      expect(res.body.message).toContain('chỉ được nhập 1 vế')
    })

    it('trùng số TK → giữ dòng cuối; dòng 0/0 bị bỏ; khoảng trắng được trim', async () => {
      const res = await http()
        .put('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .send({
          items: [
            { accountCode: ' 1111 ', accountName: ' Tiền mặt ', debitAmount: 111, creditAmount: 0 },
            { accountCode: '1111', accountName: 'Tiền mặt', debitAmount: 999, creditAmount: 0 },
            { accountCode: '3311', accountName: 'Phải trả NCC', debitAmount: 0, creditAmount: 500 },
            { accountCode: '9999', accountName: 'TK rỗng', debitAmount: 0, creditAmount: 0 },
          ],
        })
        .expect(200)

      const byCode = new Map(
        res.body.map((r: { accountCode: string }) => [r.accountCode, r as never]),
      )
      expect(res.body).toHaveLength(2)
      expect(byCode.get('1111')).toMatchObject({ debitAmount: '999', accountName: 'Tiền mặt' })
      expect(byCode.get('3311')).toMatchObject({ creditAmount: '500' })
      expect(byCode.has('9999')).toBe(false)
    })

    it('GET accounts đọc lại đúng bảng vừa ghi', async () => {
      const res = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.map((r: { accountCode: string }) => r.accountCode)).toEqual(['1111', '3311'])
    })
  })

  describe('PUT partners — số dư công nợ chi tiết + đồng bộ TK tổng', () => {
    it('1 đối tượng nhập cả 2 vế → 400', async () => {
      await http()
        .put('/api/opening-balance/partners')
        .set('Authorization', auth())
        .send({
          accountCode: '131',
          items: [{ partnerId: customerId, debitAmount: 100, creditAmount: 100 }],
        })
        .expect(400)
    })

    it('TK 331 → loại đối tượng SUPPLIER; TK 131 → CUSTOMER', async () => {
      const supplierSide = await http()
        .get('/api/opening-balance/partners?accountCode=331')
        .set('Authorization', auth())
        .expect(200)
      expect(supplierSide.body.partnerType).toBe('SUPPLIER')

      const customerSide = await http()
        .get('/api/opening-balance/partners?accountCode=131')
        .set('Authorization', auth())
        .expect(200)
      expect(customerSide.body.partnerType).toBe('CUSTOMER')
    })

    it('ghi số dư KH → đồng bộ Dư Nợ của TK 131 trong bảng số dư tài khoản', async () => {
      // TK 131 phải có sẵn dòng trong bảng số dư thì mới được đồng bộ (updateMany).
      await http()
        .put('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .send({
          items: [
            { accountCode: '131', accountName: 'Phải thu KH', debitAmount: 1, creditAmount: 0 },
            { accountCode: '331', accountName: 'Phải trả NCC', debitAmount: 0, creditAmount: 1 },
          ],
        })
        .expect(200)

      const res = await http()
        .put('/api/opening-balance/partners')
        .set('Authorization', auth())
        .send({
          accountCode: ' 131 ',
          items: [
            { partnerId: customerId, debitAmount: 100, creditAmount: 0 },
            // Trùng đối tượng → giữ dòng cuối.
            { partnerId: customerId, debitAmount: 7000000, creditAmount: 0 },
          ],
        })
        .expect(200)
      const row = res.body.items.find(
        (i: { partnerId: string }) => i.partnerId === customerId,
      )
      expect(row.debitAmount).toBe('7000000')

      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const acc131 = accounts.body.find((a: { accountCode: string }) => a.accountCode === '131')
      expect(acc131.debitAmount).toBe('7000000')
    })

    it('ghi số dư NCC vào TK 331 → Dư Có tổng khớp', async () => {
      await http()
        .put('/api/opening-balance/partners')
        .set('Authorization', auth())
        .send({
          accountCode: '331',
          items: [{ partnerId: supplierId, debitAmount: 0, creditAmount: 4500000 }],
        })
        .expect(200)

      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const acc331 = accounts.body.find((a: { accountCode: string }) => a.accountCode === '331')
      expect(acc331.creditAmount).toBe('4500000')
    })

    it('ghi mảng rỗng → xóa hết chi tiết, TK tổng về 0', async () => {
      await http()
        .put('/api/opening-balance/partners')
        .set('Authorization', auth())
        .send({ accountCode: '131', items: [] })
        .expect(200)

      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const acc131 = accounts.body.find((a: { accountCode: string }) => a.accountCode === '131')
      expect(acc131.debitAmount).toBe('0')
    })
  })

  describe('PUT bank-accounts — số dư tiền gửi chi tiết + đồng bộ TK tổng', () => {
    it('1 TK ngân hàng nhập cả 2 vế → 400', async () => {
      const res = await http()
        .put('/api/opening-balance/bank-accounts')
        .set('Authorization', auth())
        .send({
          accountCode: '1121',
          items: [{ bankAccountId, debitAmount: 100, creditAmount: 100 }],
        })
        .expect(400)
      expect(res.body.message).toContain('chỉ được nhập 1 vế')
    })

    it('ghi số dư → đọc lại đúng và TK 1121 đồng bộ theo tổng', async () => {
      await http()
        .put('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .send({
          items: [
            { accountCode: '1121', accountName: 'Tiền gửi NH', debitAmount: 1, creditAmount: 0 },
          ],
        })
        .expect(200)

      const res = await http()
        .put('/api/opening-balance/bank-accounts')
        .set('Authorization', auth())
        .send({
          accountCode: '1121',
          items: [
            { bankAccountId, debitAmount: 1000, creditAmount: 0 },
            // Trùng TK NH → giữ dòng cuối.
            { bankAccountId, debitAmount: 12000000, creditAmount: 0 },
          ],
        })
        .expect(200)
      const row = res.body.items.find(
        (i: { bankAccountId: string }) => i.bankAccountId === bankAccountId,
      )
      expect(row.debitAmount).toBe('12000000')

      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const acc = accounts.body.find((a: { accountCode: string }) => a.accountCode === '1121')
      expect(acc.debitAmount).toBe('12000000')
    })

    it('ghi mảng rỗng → chi tiết bị xóa, TK 1121 về 0', async () => {
      await http()
        .put('/api/opening-balance/bank-accounts')
        .set('Authorization', auth())
        .send({ accountCode: '1121', items: [] })
        .expect(200)
      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const acc = accounts.body.find((a: { accountCode: string }) => a.accountCode === '1121')
      expect(acc.debitAmount).toBe('0')
    })
  })

  describe('PUT fixed-assets — ràng buộc nguyên giá / hao mòn', () => {
    const asset = (overrides: Record<string, unknown> = {}) => ({
      code: `${TAG}-TS01`,
      name: 'Máy nén khí IT',
      assetType: 'Máy móc thiết bị',
      department: 'Xưởng',
      originalCost: 100000000,
      depreciableValue: 100000000,
      accumulatedDepreciation: 30000000,
      acquisitionDate: '2025-01-01',
      depreciationDate: '2025-01-01',
      usefulLifeMonths: 60,
      remainingMonths: 50,
      assetAccount: '2112',
      depreciationAccount: '2141',
      ...overrides,
    })

    it('nguyên giá 0 → 400', async () => {
      const res = await http()
        .put('/api/opening-balance/fixed-assets')
        .set('Authorization', auth())
        .send({ items: [asset({ originalCost: 0 })] })
        .expect(400)
      expect(res.body.message).toContain('nguyên giá phải > 0')
    })

    it('hao mòn lũy kế vượt nguyên giá → 400', async () => {
      const res = await http()
        .put('/api/opening-balance/fixed-assets')
        .set('Authorization', auth())
        .send({ items: [asset({ accumulatedDepreciation: 200000000 })] })
        .expect(400)
      expect(res.body.message).toContain('không được vượt nguyên giá')
    })

    it('ghi hợp lệ → TK 2112 Dư Nợ = nguyên giá, TK 2141 Dư Có = hao mòn', async () => {
      await http()
        .put('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .send({
          items: [
            { accountCode: '2112', accountName: 'Nguyên giá', debitAmount: 1, creditAmount: 0 },
            { accountCode: '2141', accountName: 'Hao mòn', debitAmount: 0, creditAmount: 1 },
          ],
        })
        .expect(200)

      const res = await http()
        .put('/api/opening-balance/fixed-assets')
        .set('Authorization', auth())
        .send({ items: [asset(), asset({ name: 'Bản ghi sau cùng' })] })
        .expect(200)
      // Trùng mã tài sản → giữ dòng cuối.
      expect(res.body).toHaveLength(1)
      expect(res.body[0].name).toBe('Bản ghi sau cùng')

      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const nguyenGia = accounts.body.find((a: { accountCode: string }) => a.accountCode === '2112')
      const haoMon = accounts.body.find((a: { accountCode: string }) => a.accountCode === '2141')
      expect(nguyenGia.debitAmount).toBe('100000000')
      expect(haoMon.creditAmount).toBe('30000000')
    })

    it('ghi mảng rỗng → TK nguyên giá / hao mòn reset về 0', async () => {
      await http()
        .put('/api/opening-balance/fixed-assets')
        .set('Authorization', auth())
        .send({ items: [] })
        .expect(200)
      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const nguyenGia = accounts.body.find((a: { accountCode: string }) => a.accountCode === '2112')
      const haoMon = accounts.body.find((a: { accountCode: string }) => a.accountCode === '2141')
      expect(nguyenGia.debitAmount).toBe('0')
      expect(haoMon.creditAmount).toBe('0')
    })
  })

  describe('PUT inventory — đồng bộ TK kho theo tính chất VTHH', () => {
    it('ghi tồn cho VTHH → TK kho tương ứng nhận Dư Nợ; ghi rỗng → reset về 0', async () => {
      const prisma = prismaOf(app)
      // Chọn 1 VTHH loại vật tư (TK kho ngầm định 152 khi danh mục không khai TK).
      const product = await prisma.product.findFirst({
        where: { type: 'MATERIAL' },
        select: { id: true, inventoryAccount: true },
      })
      expect(product).not.toBeNull()
      const accountCode = product!.inventoryAccount?.trim() || '152'

      await http()
        .put('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .send({
          items: [{ accountCode, accountName: 'TK kho', debitAmount: 1, creditAmount: 0 }],
        })
        .expect(200)

      await http()
        .put('/api/opening-balance/inventory')
        .set('Authorization', auth())
        .send({
          items: [
            { productId: product!.id, warehouseCode: 'KHO VAT TU', quantity: 1, amount: 1000 },
            // Trùng VTHH + kho → giữ dòng cuối.
            { productId: product!.id, warehouseCode: 'KHO VAT TU', quantity: 3, amount: 6000000 },
            // Dòng 0/0 bị bỏ qua.
            { productId: product!.id, warehouseCode: 'KHO THANH PHAM', quantity: 0, amount: 0 },
          ],
        })
        .expect(200)

      const accounts = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const stock = accounts.body.find((a: { accountCode: string }) => a.accountCode === accountCode)
      expect(stock.debitAmount).toBe('6000000')

      await http()
        .put('/api/opening-balance/inventory')
        .set('Authorization', auth())
        .send({ items: [] })
        .expect(200)
      const after = await http()
        .get('/api/opening-balance/accounts')
        .set('Authorization', auth())
        .expect(200)
      const reset = after.body.find((a: { accountCode: string }) => a.accountCode === accountCode)
      expect(reset.debitAmount).toBe('0')
    })
  })

  describe('khóa sổ chặn mọi thao tác sửa số dư đầu kỳ', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .put('/api/book-lock')
        .set('Authorization', `Bearer ${token}`)
        .send({ lockDate: '2026-01-31' })
        .expect(200)
    })

    afterAll(async () => {
      await request(app.getHttpServer())
        .delete('/api/book-lock')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
    })

    it.each([
      ['/api/opening-balance/accounts', { items: [] }],
      ['/api/opening-balance/fixed-assets', { items: [] }],
      ['/api/opening-balance/inventory', { items: [] }],
      ['/api/opening-balance/partners', { accountCode: '131', items: [] }],
      ['/api/opening-balance/bank-accounts', { accountCode: '1121', items: [] }],
    ])('PUT %s khi đã khóa sổ → 400', async (route, body) => {
      const res = await http().put(route).set('Authorization', auth()).send(body).expect(400)
      expect(res.body.message).toContain('bỏ khóa sổ trước khi sửa số dư đầu kỳ')
    })
  })
})
