import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Mọi parser danh mục dùng chung khuôn: tìm hàng header theo nhãn "mã/tên",
// mỗi cột tùy chọn đọc bằng `iX >= 0 ? … : null`, cột "Trạng thái" map
// "Ngừng sử dụng" → không hoạt động. Spec quét từng danh mục còn lại với 3 ca:
// không có header → rỗng; chỉ cột bắt buộc (tên cột dạng rút gọn) → mặc định;
// đủ cột + "Ngừng sử dụng" → dữ liệu đầy đủ, isActive=false.
const TAG = 'IT-CATMTX'

function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Catalog import — quét nhánh cột theo từng danh mục (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const upload = (url: string, rows: unknown[][]) =>
    http()
      .post(url)
      .set('Authorization', auth())
      .attach('file', buildXlsx(rows), 'catalog.xlsx')
      .expect(201)

  const EMPTY = { total: 0, created: 0, skipped: 0 }
  const ONE = { total: 1, created: 1, skipped: 0 }

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    const byCode = { code: { startsWith: TAG } }
    await prisma.bank.deleteMany({ where: { shortName: { startsWith: TAG } } })
    await prisma.organizationUnit.deleteMany({ where: byCode })
    await prisma.partnerGroup.deleteMany({ where: byCode })
    await prisma.unit.deleteMany({ where: { name: { startsWith: TAG } } })
    await prisma.voucherType.deleteMany({ where: byCode })
    await prisma.expenseItem.deleteMany({ where: byCode })
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('ngân hàng', () => {
    const URL = '/api/catalog/banks/import'

    it('không có cột tên viết tắt → rỗng', async () => {
      const res = await upload(URL, [
        ['Cột lạ'],
        ['VCB'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('tên cột rút gọn "Viết tắt"/"Tên ngân hàng"; đủ cột + ngừng sử dụng', async () => {
      // Thiếu tên đầy đủ → parser bỏ dòng.
      expect((await upload(URL, [['Viết tắt'], [`${TAG}-NH0`]])).body).toEqual(EMPTY)

      const min = await upload(URL, [
        ['Viết tắt', 'Tên ngân hàng'],
        [`${TAG}-NH1`, 'Ngân hàng rút gọn'],
      ])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Tên viết tắt', 'Tên đầy đủ', 'Trạng thái'],
        [`${TAG}-NH2`, 'Ngân hàng TMCP Kiểm Thử', 'Ngừng sử dụng'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).bank.findMany({
        where: { shortName: { startsWith: TAG } },
        orderBy: { shortName: 'asc' },
      })
      expect(rows).toHaveLength(2)
      expect(rows[0]!.isActive).toBe(true)
      expect(rows[1]!.fullName).toBe('Ngân hàng TMCP Kiểm Thử')
      expect(rows[1]!.isActive).toBe(false)
    })
  })

  describe('cơ cấu tổ chức', () => {
    const URL = '/api/catalog/organization-units/import'

    it('không có cột mã → rỗng', async () => {
      const res = await upload(URL, [['Tên đơn vị'], ['Phòng Kế toán']])
      expect(res.body).toEqual(EMPTY)
    })

    it('cột rút gọn; đủ cột + ngừng sử dụng', async () => {
      const min = await upload(URL, [
        ['Mã', 'Tên'],
        [`${TAG}-DV1`, 'Đơn vị tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Mã đơn vị', 'Tên đơn vị', 'Địa chỉ', 'Cấp tổ chức', 'Trạng thái'],
        [`${TAG}-DV2`, 'Đơn vị đủ cột', 'Số 1 Trần Phú', 'Phòng ban', 'Ngừng sử dụng'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).organizationUnit.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows[0]!.address).toBeNull()
      expect(rows[0]!.isActive).toBe(true)
      expect(rows[1]!.address).toBe('Số 1 Trần Phú')
      expect(rows[1]!.isActive).toBe(false)
    })
  })

  describe('nhóm khách hàng, nhà cung cấp', () => {
    const URL = '/api/catalog/partner-groups/import'

    it('không có cột mã → rỗng', async () => {
      const res = await upload(URL, [['Tên nhóm'], ['Nhóm A']])
      expect(res.body).toEqual(EMPTY)
    })

    it('cột rút gọn; đủ cột + ngừng sử dụng', async () => {
      const min = await upload(URL, [
        ['Mã', 'Tên'],
        [`${TAG}-NHOM1`, 'Nhóm tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Mã nhóm KH, NCC', 'Tên nhóm khách hàng, nhà cung cấp', 'Diễn giải', 'Trạng thái'],
        [`${TAG}-NHOM2`, 'Nhóm đủ cột', 'Diễn giải nhóm', 'Ngừng sử dụng'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).partnerGroup.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows[0]!.description).toBeNull()
      expect(rows[1]!.description).toBe('Diễn giải nhóm')
      expect(rows[1]!.isActive).toBe(false)
    })
  })

  describe('đơn vị tính', () => {
    const URL = '/api/catalog/units/import'

    it('không có cột đơn vị tính → rỗng', async () => {
      const res = await upload(URL, [['Cột lạ'], ['Cái']])
      expect(res.body).toEqual(EMPTY)
    })

    it('cột rút gọn "Tên"; đủ cột + ngừng sử dụng', async () => {
      const min = await upload(URL, [['Tên'], [`${TAG}-DVT1`]])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Đơn vị tính', 'Mô tả', 'Trạng thái'],
        [`${TAG}-DVT2`, 'Mô tả ĐVT', 'Ngừng sử dụng'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).unit.findMany({
        where: { name: { startsWith: TAG } },
        orderBy: { name: 'asc' },
      })
      expect(rows[0]!.description).toBeNull()
      expect(rows[1]!.description).toBe('Mô tả ĐVT')
      expect(rows[1]!.isActive).toBe(false)
    })
  })

  describe('loại chứng từ', () => {
    const URL = '/api/catalog/voucher-types/import'

    it('không có cột mã → rỗng', async () => {
      const res = await upload(URL, [['Tên loại chứng từ'], ['Phiếu thu']])
      expect(res.body).toEqual(EMPTY)
    })

    it('cột rút gọn; đủ cột + ngừng sử dụng', async () => {
      const min = await upload(URL, [
        ['Mã', 'Tên'],
        [`${TAG}-LCT1`, 'Loại tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Mã loại chứng từ', 'Tên loại chứng từ', 'Trạng thái'],
        [`${TAG}-LCT2`, 'Loại đủ cột', 'Ngừng sử dụng'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).voucherType.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows[0]!.isActive).toBe(true)
      expect(rows[1]!.isActive).toBe(false)
    })
  })

  describe('khoản mục chi phí', () => {
    const URL = '/api/catalog/expense-items/import'

    it('không có cột mã → rỗng', async () => {
      const res = await upload(URL, [['Tên khoản mục chi phí'], ['Chi phí vận chuyển']])
      expect(res.body).toEqual(EMPTY)
    })

    it('cột rút gọn; đủ cột + ngừng sử dụng', async () => {
      const min = await upload(URL, [
        ['Mã', 'Tên'],
        [`${TAG}-KMCP1`, 'Khoản mục tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Mã khoản mục chi phí', 'Tên khoản mục chi phí', 'Diễn giải', 'Trạng thái'],
        [`${TAG}-KMCP2`, 'Khoản mục đủ cột', 'Diễn giải KM', 'Ngừng sử dụng'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).expenseItem.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows[0]!.description).toBeNull()
      expect(rows[1]!.description).toBe('Diễn giải KM')
      expect(rows[1]!.isActive).toBe(false)
    })
  })

  describe('khách hàng', () => {
    const URL = '/api/sales/customers/import'

    it('không có cột mã khách hàng → rỗng', async () => {
      const res = await upload(URL, [['Tên khách hàng'], ['Khách A']])
      expect(res.body).toEqual(EMPTY)
    })

    it('cột rút gọn "Mã KH"; đủ cột', async () => {
      const min = await upload(URL, [
        ['Mã KH', 'Tên'],
        [`${TAG}-KH1`, 'Khách tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const full = await upload(URL, [
        ['Mã khách hàng', 'Tên khách hàng', 'Địa chỉ', 'MST', 'Số điện thoại'],
        [`${TAG}-KH2`, 'Khách đủ cột', 'Số 3 Lê Duẩn', '0303030303', '0987654321'],
      ])
      expect(full.body).toEqual(ONE)

      const rows = await prismaOf(app).customer.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows[0]!.address).toBeNull()
      expect(rows[0]!.taxCode).toBeNull()
      expect(rows[0]!.phone).toBeNull()
      expect(rows[1]!.address).toBe('Số 3 Lê Duẩn')
      expect(rows[1]!.taxCode).toBe('0303030303')
      expect(rows[1]!.phone).toBe('0987654321')
    })

    it('nhập lại cùng mã → skipped', async () => {
      const rows: unknown[][] = [
        ['Mã khách hàng', 'Tên khách hàng'],
        [`${TAG}-KH3`, 'Khách trùng'],
      ]
      expect((await upload(URL, rows)).body).toEqual(ONE)
      expect((await upload(URL, rows)).body).toEqual({ total: 1, created: 0, skipped: 1 })
    })
  })

  describe('hệ thống tài khoản / kho / TK ngân hàng — nhánh thiếu cột', () => {
    it('tài khoản: không có cột số TK → rỗng; chỉ cột bắt buộc → mặc định', async () => {
      const URL = '/api/catalog/accounts/import'
      expect((await upload(URL, [['Tên tài khoản'], ['TK lạ']])).body).toEqual(EMPTY)

      const min = await upload(URL, [
        ['Số TK', 'Tên TK'],
        [`${TAG}9`, 'TK tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const acc = await prismaOf(app).account.findFirst({ where: { number: `${TAG}9` } })
      expect(acc?.nameEn).toBeNull()
      expect(acc?.description).toBeNull()
      expect(acc?.isActive).toBe(true)
      await prismaOf(app).account.deleteMany({ where: { number: { startsWith: TAG } } })
    })

    it('kho: không có cột mã → rỗng; cột rút gọn → mặc định', async () => {
      const URL = '/api/catalog/warehouses/import'
      expect((await upload(URL, [['Tên kho'], ['Kho lạ']])).body).toEqual(EMPTY)

      const min = await upload(URL, [
        ['Mã', 'Tên'],
        [`${TAG}-K1`, 'Kho tối thiểu'],
      ])
      expect(min.body).toEqual(ONE)

      const kho = await prismaOf(app).warehouse.findFirst({ where: { code: `${TAG}-K1` } })
      expect(kho?.address).toBeNull()
      expect(kho?.branch).toBeNull()
      await prismaOf(app).warehouse.deleteMany({ where: { code: { startsWith: TAG } } })
    })

    it('TK ngân hàng: không có cột số TK → rỗng; cột rút gọn → mặc định', async () => {
      const URL = '/api/catalog/bank-accounts/import'
      expect((await upload(URL, [['Tên ngân hàng'], ['VCB']])).body).toEqual(EMPTY)

      const min = await upload(URL, [
        ['Số TK', 'Tên ngân hàng'],
        [`${TAG}-TK9`, 'Vietcombank'],
      ])
      expect(min.body).toEqual(ONE)

      const tk = await prismaOf(app).bankAccount.findFirst({
        where: { accountNumber: `${TAG}-TK9` },
      })
      expect(tk?.bankBranch).toBeNull()
      expect(tk?.accountHolder).toBeNull()
      expect(tk?.branch).toBeNull()
      await prismaOf(app).bankAccount.deleteMany({
        where: { accountNumber: { startsWith: TAG } },
      })
    })
  })
})
