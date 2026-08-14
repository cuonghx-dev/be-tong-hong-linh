import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-TREE'
const FAKE_ID = '00000000-0000-4000-8000-000000000000'

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Ba danh mục dạng cây (cha-con) dùng chung bộ nhánh lỗi: trùng mã, cha không tồn tại,
// vòng lặp cha-con, xóa khi còn con. accounts dùng field `number`, hai danh mục kia dùng `code`.
interface TreeCase {
  entity: string
  route: string
  keyField: string
  rootBody: Record<string, unknown>
  childBody: Record<string, unknown>
}

const TREE_CASES: TreeCase[] = [
  {
    entity: 'hệ thống tài khoản',
    route: '/api/catalog/accounts',
    keyField: 'number',
    rootBody: { number: '997', name: `${TAG} TK cha`, nature: 'DEBIT' },
    childBody: { number: '9971', name: `${TAG} TK con`, nature: 'DEBIT' },
  },
  {
    entity: 'khoản mục chi phí',
    route: '/api/catalog/expense-items',
    keyField: 'code',
    rootBody: { code: `${TAG}-KM`, name: `${TAG} Khoản mục cha` },
    childBody: { code: `${TAG}-KM.C`, name: `${TAG} Khoản mục con` },
  },
  {
    entity: 'cơ cấu tổ chức',
    route: '/api/catalog/organization-units',
    keyField: 'code',
    rootBody: { code: `${TAG}-CN`, name: `${TAG} Chi nhánh`, level: 'BRANCH' },
    childBody: { code: `${TAG}-PB`, name: `${TAG} Phòng ban`, level: 'DEPARTMENT' },
  },
]

describe('Catalog danh mục dạng cây (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    // Gỡ liên kết cha-con trước rồi mới xóa để không vướng FK.
    await prisma.account.updateMany({
      where: { number: { startsWith: '997' } },
      data: { parentId: null },
    })
    await prisma.account.deleteMany({ where: { number: { startsWith: '997' } } })
    await prisma.expenseItem.updateMany({
      where: { code: { startsWith: TAG } },
      data: { parentId: null },
    })
    await prisma.expenseItem.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.organizationUnit.updateMany({
      where: { code: { startsWith: TAG } },
      data: { parentId: null },
    })
    await prisma.organizationUnit.deleteMany({ where: { code: { startsWith: TAG } } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe.each(TREE_CASES)('$entity — $route', ({ route, keyField, rootBody, childBody }) => {
    let rootId: string
    let childId: string

    it('GET :id không tồn tại → 404', async () => {
      await http().get(`${route}/${FAKE_ID}`).set('Authorization', auth()).expect(404)
    })

    it('PATCH :id không tồn tại → 404', async () => {
      await http()
        .patch(`${route}/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ name: 'x' })
        .expect(404)
    })

    it('DELETE :id không tồn tại → 404', async () => {
      await http().delete(`${route}/${FAKE_ID}`).set('Authorization', auth()).expect(404)
    })

    it('POST cha → 201, POST con gắn parentId → 201', async () => {
      const root = await http()
        .post(route)
        .set('Authorization', auth())
        .send(rootBody)
        .expect(201)
      rootId = root.body.id

      const child = await http()
        .post(route)
        .set('Authorization', auth())
        .send({ ...childBody, parentId: rootId })
        .expect(201)
      childId = child.body.id
      expect(child.body.parentId).toBe(rootId)
    })

    it('POST trùng mã → 409', async () => {
      await http().post(route).set('Authorization', auth()).send(rootBody).expect(409)
    })

    it('POST parentId không tồn tại → 404', async () => {
      await http()
        .post(route)
        .set('Authorization', auth())
        .send({ ...childBody, [keyField]: `${childBody[keyField]}X`, parentId: FAKE_ID })
        .expect(404)
    })

    it('PATCH đổi mã sang mã đã tồn tại → 409', async () => {
      await http()
        .patch(`${route}/${childId}`)
        .set('Authorization', auth())
        .send({ [keyField]: rootBody[keyField] })
        .expect(409)
    })

    it('PATCH cha nhận chính con của nó làm cha → 409 (chặn vòng lặp)', async () => {
      await http()
        .patch(`${route}/${rootId}`)
        .set('Authorization', auth())
        .send({ parentId: childId })
        .expect(409)
    })

    it('PATCH parentId không tồn tại → 404', async () => {
      await http()
        .patch(`${route}/${childId}`)
        .set('Authorization', auth())
        .send({ parentId: FAKE_ID })
        .expect(404)
    })

    it('DELETE cha khi còn con → 409', async () => {
      await http().delete(`${route}/${rootId}`).set('Authorization', auth()).expect(409)
    })

    it('PATCH con bỏ cha (parentId rỗng) → 200 parentId null', async () => {
      const res = await http()
        .patch(`${route}/${childId}`)
        .set('Authorization', auth())
        .send({ parentId: '' })
        .expect(200)
      expect(res.body.parentId).toBeNull()
    })

    it('DELETE con rồi cha → 200', async () => {
      await http().delete(`${route}/${childId}`).set('Authorization', auth()).expect(200)
      await http().delete(`${route}/${rootId}`).set('Authorization', auth()).expect(200)
    })
  })

  describe('import xlsx — tạo mới + gán cha + khử trùng trong file', () => {
    it('expense-items: cha + con theo tiền tố dấu chấm + dòng trùng → created 2, skipped 1', async () => {
      const buffer = buildXlsx([
        ['Mã khoản mục chi phí', 'Tên khoản mục chi phí', 'Diễn giải', 'Trạng thái'],
        [`${TAG}-IMP`, 'Khoản mục cha', null, 'Đang sử dụng'],
        [`${TAG}-IMP.VL`, 'Khoản mục con', 'con của IMP', 'Ngừng sử dụng'],
        [`${TAG}-IMP`, 'Trùng trong file', null, 'Đang sử dụng'],
      ])
      const res = await http()
        .post('/api/catalog/expense-items/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'kmcp-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const prisma = prismaOf(app)
      const parent = await prisma.expenseItem.findUnique({ where: { code: `${TAG}-IMP` } })
      const child = await prisma.expenseItem.findUnique({ where: { code: `${TAG}-IMP.VL` } })
      expect(child?.parentId).toBe(parent?.id)
      expect(child?.isActive).toBe(false)
    })

    it('accounts: gán cha theo tiền tố số TK + map tính chất Dư Có/Lưỡng tính', async () => {
      const buffer = buildXlsx([
        ['Số tài khoản', 'Tên tài khoản', 'Tính chất', 'Tên tiếng Anh', 'Diễn giải', 'Trạng thái'],
        ['9975', `${TAG} TK nhập cha`, 'Dư Nợ', null, null, 'Đang sử dụng'],
        ['99751', `${TAG} TK nhập con`, 'Dư Có', 'Test EN', 'ghi chú', 'Ngừng sử dụng'],
        ['99752', `${TAG} TK lưỡng tính`, 'Lưỡng tính', null, null, 'Đang sử dụng'],
        ['9975', `${TAG} trùng trong file`, 'Dư Nợ', null, null, 'Đang sử dụng'],
      ])
      const res = await http()
        .post('/api/catalog/accounts/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tk-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 4, created: 3, skipped: 1 })

      const prisma = prismaOf(app)
      const parent = await prisma.account.findUnique({ where: { number: '9975' } })
      const child = await prisma.account.findUnique({ where: { number: '99751' } })
      const dual = await prisma.account.findUnique({ where: { number: '99752' } })
      expect(child?.parentId).toBe(parent?.id)
      expect(child?.nature).toBe('CREDIT')
      expect(child?.isActive).toBe(false)
      expect(dual?.nature).toBe('DUAL')
    })

    it('organization-units: phòng ban thuộc chi nhánh gần nhất phía trên theo thứ tự dòng', async () => {
      const buffer = buildXlsx([
        ['Mã đơn vị', 'Tên đơn vị', 'Địa chỉ', 'Cấp tổ chức', 'Trạng thái'],
        [`${TAG}-ICN`, 'Chi nhánh nhập', 'Hà Nội', 'Chi nhánh', 'Đang sử dụng'],
        [`${TAG}-IPB`, 'Phòng ban nhập', null, 'Phòng ban', 'Đang sử dụng'],
        [`${TAG}-ICN`, 'Trùng trong file', null, 'Chi nhánh', 'Đang sử dụng'],
      ])
      const res = await http()
        .post('/api/catalog/organization-units/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'cctc-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const prisma = prismaOf(app)
      const branch = await prisma.organizationUnit.findUnique({ where: { code: `${TAG}-ICN` } })
      const dept = await prisma.organizationUnit.findUnique({ where: { code: `${TAG}-IPB` } })
      expect(branch?.level).toBe('BRANCH')
      expect(dept?.parentId).toBe(branch?.id)
    })

    it.each([
      ['/api/catalog/expense-items/import'],
      ['/api/catalog/accounts/import'],
      ['/api/catalog/organization-units/import'],
    ])('%s: file không có header hợp lệ → total 0', async (route) => {
      const res = await http()
        .post(route)
        .set('Authorization', auth())
        .attach('file', buildXlsx([['Cột lạ'], ['x']]), 'rong.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
    })
  })

  // Phủ Transform isActive + nhánh keyword của mọi FilterDto danh mục.
  describe('list filter — keyword + isActive', () => {
    const LIST_ROUTES = [
      '/api/catalog/units',
      '/api/catalog/warehouses',
      '/api/catalog/banks',
      '/api/catalog/bank-accounts',
      '/api/catalog/employees',
      '/api/catalog/partner-groups',
      '/api/catalog/product-groups',
      '/api/catalog/products',
      '/api/catalog/expense-items',
      '/api/catalog/income-expense-items',
      '/api/catalog/cost-objects',
      '/api/catalog/organization-units',
      '/api/catalog/transfer-accounts',
      '/api/catalog/default-accounts',
      '/api/catalog/voucher-types',
      '/api/catalog/accounts',
      '/api/sales/customers',
      '/api/purchase/suppliers',
    ]

    it.each(LIST_ROUTES.map((r) => [r]))(
      '%s?keyword=…&isActive=true → 200 có phân trang',
      async (route) => {
        const res = await http()
          .get(`${route}?keyword=zzz-khong-co&isActive=true&page=1&pageSize=5`)
          .set('Authorization', auth())
          .expect(200)
        expect(Array.isArray(res.body.data)).toBe(true)
        expect(res.body.pagination.total).toBeGreaterThanOrEqual(0)
      },
    )

    it('accounts lọc theo nature + organization-units lọc theo level → 200', async () => {
      const acc = await http()
        .get('/api/catalog/accounts?nature=CREDIT&pageSize=5')
        .set('Authorization', auth())
        .expect(200)
      expect(acc.body.pagination.total).toBeGreaterThan(0)

      const org = await http()
        .get('/api/catalog/organization-units?level=DEPARTMENT&pageSize=5')
        .set('Authorization', auth())
        .expect(200)
      expect(Array.isArray(org.body.data)).toBe(true)
    })
  })
})
