import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp, loginAs } from '../helpers/test-app'

const TAG = 'IT-CRUD'

// CRUD chuẩn cho mọi danh mục: POST → GET list → GET :id → PATCH → DELETE → GET :id 404.
// accounts đã có test riêng trong catalog.integration.spec.ts.
interface CrudCase {
  entity: string
  route: string
  create: Record<string, unknown>
  /** Field dùng để nhận diện bản ghi vừa tạo trong response. */
  echoField: string
  patch: Record<string, unknown>
}

const CASES: CrudCase[] = [
  {
    entity: 'đơn vị tính',
    route: '/api/catalog/units',
    create: { name: `${TAG} Thùng` },
    echoField: 'name',
    patch: { description: 'đã sửa' },
  },
  {
    entity: 'kho',
    route: '/api/catalog/warehouses',
    create: { code: `${TAG}-KHO`, name: `${TAG} Kho kiểm thử` },
    echoField: 'code',
    patch: { name: `${TAG} Kho đã sửa` },
  },
  {
    entity: 'ngân hàng',
    route: '/api/catalog/banks',
    create: { shortName: `${TAG}-NH`, fullName: `${TAG} Ngân hàng kiểm thử` },
    echoField: 'shortName',
    patch: { fullName: `${TAG} Ngân hàng đã sửa` },
  },
  {
    entity: 'tài khoản ngân hàng',
    route: '/api/catalog/bank-accounts',
    create: { accountNumber: `999${Date.now() % 1000000}`, bankName: `${TAG} Bank` },
    echoField: 'bankName',
    patch: { bankName: `${TAG} Bank đã sửa` },
  },
  {
    entity: 'nhân viên',
    route: '/api/catalog/employees',
    create: { code: `${TAG}-NV`, name: `${TAG} Nhân viên` },
    echoField: 'code',
    patch: { name: `${TAG} Nhân viên đã sửa` },
  },
  {
    entity: 'nhóm KH/NCC',
    route: '/api/catalog/partner-groups',
    create: { code: `${TAG}-NKH`, name: `${TAG} Nhóm KH` },
    echoField: 'code',
    patch: { name: `${TAG} Nhóm KH đã sửa` },
  },
  {
    entity: 'nhóm VTHH',
    route: '/api/catalog/product-groups',
    create: { code: `${TAG}-NVT`, name: `${TAG} Nhóm VTHH` },
    echoField: 'code',
    patch: { name: `${TAG} Nhóm VTHH đã sửa` },
  },
  {
    entity: 'vật tư hàng hóa',
    route: '/api/catalog/products',
    create: { code: `${TAG}-SP`, name: `${TAG} Sản phẩm`, type: 'GOODS' },
    echoField: 'code',
    patch: { name: `${TAG} Sản phẩm đã sửa` },
  },
  {
    entity: 'khoản mục chi phí',
    route: '/api/catalog/expense-items',
    create: { code: `${TAG}-KMCP`, name: `${TAG} Khoản mục` },
    echoField: 'code',
    patch: { name: `${TAG} Khoản mục đã sửa` },
  },
  {
    entity: 'mục thu/chi',
    route: '/api/catalog/income-expense-items',
    create: { code: `${TAG}-MTC`, name: `${TAG} Mục thu`, type: 'INCOME' },
    echoField: 'code',
    patch: { name: `${TAG} Mục thu đã sửa` },
  },
  {
    entity: 'đối tượng THCP',
    route: '/api/catalog/cost-objects',
    create: { code: `${TAG}-THCP`, name: `${TAG} Đối tượng`, type: 'OTHER' },
    echoField: 'code',
    patch: { name: `${TAG} Đối tượng đã sửa` },
  },
  {
    entity: 'cơ cấu tổ chức',
    route: '/api/catalog/organization-units',
    create: { code: `${TAG}-PB`, name: `${TAG} Phòng ban`, level: 'DEPARTMENT' },
    echoField: 'code',
    patch: { name: `${TAG} Phòng ban đã sửa` },
  },
  {
    entity: 'tài khoản kết chuyển',
    route: '/api/catalog/transfer-accounts',
    create: {
      order: 9901,
      code: `${TAG}-KC`,
      fromAccount: '511',
      toAccount: '911',
      side: 'DEBIT',
    },
    echoField: 'code',
    patch: { description: 'đã sửa' },
  },
  {
    entity: 'tài khoản ngầm định',
    route: '/api/catalog/default-accounts',
    create: { name: `${TAG} TK ngầm định` },
    echoField: 'name',
    patch: { name: `${TAG} TK ngầm định đã sửa` },
  },
  {
    entity: 'loại chứng từ',
    route: '/api/catalog/voucher-types',
    create: { code: `${TAG}-LCT`, name: `${TAG} Loại chứng từ` },
    echoField: 'code',
    patch: { name: `${TAG} Loại chứng từ đã sửa` },
  },
  {
    entity: 'khách hàng',
    route: '/api/sales/customers',
    create: { code: `${TAG}-KH`, name: `${TAG} Khách hàng` },
    echoField: 'code',
    patch: { name: `${TAG} Khách hàng đã sửa` },
  },
  {
    entity: 'nhà cung cấp',
    route: '/api/purchase/suppliers',
    create: { code: `${TAG}-NCC`, name: `${TAG} Nhà cung cấp`, type: 'ORG' },
    echoField: 'code',
    patch: { name: `${TAG} Nhà cung cấp đã sửa` },
  },
]

describe('Catalog CRUD (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe.each(CASES)('$entity — $route', ({ route, create, echoField, patch }) => {
    let id: string

    it('GET list → 200 có phân trang', async () => {
      const res = await http().get(route).set('Authorization', auth()).expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.pagination).toEqual(
        expect.objectContaining({ total: expect.any(Number) }),
      )
    })

    it('POST tạo mới → 201', async () => {
      const res = await http().post(route).set('Authorization', auth()).send(create).expect(201)
      expect(res.body[echoField]).toBe(create[echoField])
      id = res.body.id
    })

    it('GET :id → 200 đúng bản ghi', async () => {
      const res = await http().get(`${route}/${id}`).set('Authorization', auth()).expect(200)
      expect(res.body[echoField]).toBe(create[echoField])
    })

    it('PATCH → 200 field đã đổi', async () => {
      const res = await http()
        .patch(`${route}/${id}`)
        .set('Authorization', auth())
        .send(patch)
        .expect(200)
      const [key, value] = Object.entries(patch)[0]!
      expect(res.body[key]).toBe(value)
    })

    it('DELETE → 200, GET lại → 404', async () => {
      await http().delete(`${route}/${id}`).set('Authorization', auth()).expect(200)
      await http().get(`${route}/${id}`).set('Authorization', auth()).expect(404)
    })

    it('POST thiếu field bắt buộc → 400', async () => {
      await http().post(route).set('Authorization', auth()).send({}).expect(400)
    })
  })
})
