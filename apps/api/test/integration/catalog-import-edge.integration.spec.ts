import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Nhánh biên của các parser danh mục (transfer-account, default-account,
// cost-object, employee, income-expense-item, supplier): không tìm thấy header,
// tên cột biến thể / viết hoa khác, dòng thiếu trường bắt buộc, và các hàm map
// văn bản → enum (bên kết chuyển, loại đối tượng, thu/chi, cá nhân/tổ chức,
// trạng thái ngừng sử dụng, số thứ tự tự sinh khi thiếu cột).
const TAG = 'IT-CATEDGE'

function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Catalog import — nhánh biên parser (integration)', () => {
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

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await prisma.transferAccount.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.defaultAccount.deleteMany({ where: { name: { startsWith: TAG } } })
    await prisma.costObject.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.employee.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.incomeExpenseItem.deleteMany({ where: { code: { startsWith: TAG } } })
    await deleteSuppliersByPrefix(prisma, TAG)
    await app.close()
  })

  describe('tài khoản kết chuyển', () => {
    const URL = '/api/catalog/transfer-accounts/import'

    it('không có cột mã → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Kết chuyển từ', 'Kết chuyển đến'],
        ['632', '911'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('dòng thiếu TK từ / TK đến bị bỏ', async () => {
      const res = await upload(URL, [
        ['Mã kết chuyển', 'Kết chuyển từ', 'Kết chuyển đến'],
        [`${TAG}-KC-NOFROM`, null, '911'],
        [`${TAG}-KC-NOTO`, '632', null],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('tên cột rút gọn + hoa/thường khác; map bên kết chuyển và trạng thái', async () => {
      const res = await upload(URL, [
        ['MÃ', '  Kết Chuyển Từ ', 'KẾT CHUYỂN ĐẾN', 'Bên', 'Trạng thái', 'Diễn giải'],
        [`${TAG}-KC1`, '632', '911', 'Nợ', 'Đang sử dụng', 'Kết chuyển giá vốn'],
        [`${TAG}-KC2`, '511', '911', 'Có', 'Ngừng sử dụng', null],
        [`${TAG}-KC3`, '635', '911', 'Không rõ', null, null],
      ])
      expect(res.body).toEqual({ total: 3, created: 3, skipped: 0 })

      const rows = await prismaOf(app).transferAccount.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows.map((r) => r.side)).toEqual(['DEBIT', 'CREDIT', 'BOTH'])
      expect(rows.map((r) => r.isActive)).toEqual([true, false, true])
      expect(rows[0]?.description).toBe('Kết chuyển giá vốn')
      expect(rows[1]?.description).toBeNull()
      // Thiếu cột thứ tự → đánh số theo vị trí trong file.
      expect(rows.map((r) => r.order)).toEqual([1, 2, 3])
    })

    it('nhập lại cùng mã → skipped', async () => {
      const rows: unknown[][] = [
        ['Mã kết chuyển', 'Kết chuyển từ', 'Kết chuyển đến', 'Thứ tự'],
        [`${TAG}-KC-DUP`, '632', '911', 'STT 7'],
      ]
      const first = await upload(URL, rows)
      expect(first.body).toEqual({ total: 1, created: 1, skipped: 0 })
      // Cột thứ tự dạng chữ + số → lấy phần số.
      const row = await prismaOf(app).transferAccount.findFirst({
        where: { code: `${TAG}-KC-DUP` },
      })
      expect(row?.order).toBe(7)

      const again = await upload(URL, rows)
      expect(again.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })
  })

  describe('tài khoản ngầm định', () => {
    const URL = '/api/catalog/default-accounts/import'

    it('không có cột "Loại" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['TK Nợ', 'TK Có'],
        ['111', '511'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('biến thể tên cột; thiếu TK Nợ/Có → null; "Ngừng sử dụng" → không hoạt động', async () => {
      const res = await upload(URL, [
        ['Thứ tự', 'Loại nghiệp vụ', 'Tài khoản Nợ', 'Tài khoản Có', 'Trạng thái'],
        [1, `${TAG} thu tiền`, '1111', '131', null],
        [null, `${TAG} nghiệp vụ ngừng`, null, null, 'Ngừng sử dụng'],
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const rows = await prismaOf(app).defaultAccount.findMany({
        where: { name: { startsWith: TAG } },
        orderBy: { name: 'asc' },
      })
      expect(rows).toHaveLength(2)
      const stopped = rows.find((r) => r.name.includes('ngừng'))
      expect(stopped?.isActive).toBe(false)
      expect(stopped?.debitAccount).toBeNull()
      expect(stopped?.creditAccount).toBeNull()
    })
  })

  describe('đối tượng tập hợp chi phí', () => {
    const URL = '/api/catalog/cost-objects/import'

    it('không có cột mã → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên đối tượng', 'Loại'],
        ['Phân xưởng 1', 'Phân xưởng'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('map cột "Loại" → sản phẩm / phân xưởng / khác', async () => {
      const res = await upload(URL, [
        ['Mã đối tượng THCP', 'Tên đối tượng THCP', 'Loại'],
        [`${TAG}-CO1`, 'Sản phẩm bê tông', 'Sản phẩm'],
        [`${TAG}-CO2`, 'Xưởng trộn', 'Phân xưởng'],
        [`${TAG}-CO3`, 'Khác', 'Loại lạ'],
        [`${TAG}-CO4`, null, 'Sản phẩm'], // thiếu tên → bỏ
      ])
      expect(res.body).toEqual({ total: 3, created: 3, skipped: 0 })

      const rows = await prismaOf(app).costObject.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows.map((r) => r.type)).toEqual(['PRODUCT', 'WORKSHOP', 'OTHER'])
    })
  })

  describe('nhân viên', () => {
    const URL = '/api/catalog/employees/import'

    it('không có cột mã → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên nhân viên', 'Chức danh'],
        ['Nguyễn Văn A', 'Kế toán'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('tên cột biến thể; cột thiếu → null', async () => {
      const res = await upload(URL, [
        ['Mã NV', 'Tên', 'Phòng ban'],
        [`${TAG}-NV1`, 'Nguyễn Văn A', 'Kế toán'],
        [`${TAG}-NV2`, null, 'Kho'], // thiếu tên → bỏ
      ])
      expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

      const nv = await prismaOf(app).employee.findFirst({ where: { code: `${TAG}-NV1` } })
      expect(nv?.department).toBe('Kế toán')
      expect(nv?.title).toBeNull()
      expect(nv?.bankAccount).toBeNull()
      expect(nv?.bankName).toBeNull()
      expect(nv?.isActive).toBe(true)
    })
  })

  describe('mục thu/chi', () => {
    const URL = '/api/catalog/income-expense-items/import'

    it('không có cột mã → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên mục thu/chi', 'Loại'],
        ['Thu lãi', 'Mục thu'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('map loại thu/chi và cờ phát sinh định kỳ', async () => {
      const res = await upload(URL, [
        ['Mã mục thu/chi', 'Tên mục thu/chi', 'Loại', 'Phát sinh định kỳ', 'Trạng thái'],
        [`${TAG}-MTC1`, 'Thu lãi ngân hàng', 'Mục thu', 'x', null],
        [`${TAG}-MTC2`, 'Chi văn phòng phẩm', 'Mục chi', null, 'Ngừng sử dụng'],
        [`${TAG}-MTC3`, 'Không ghi loại', null, null, null],
      ])
      expect(res.body).toEqual({ total: 3, created: 3, skipped: 0 })

      const rows = await prismaOf(app).incomeExpenseItem.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows.map((r) => r.type)).toEqual(['INCOME', 'EXPENSE', 'EXPENSE'])
      expect(rows.map((r) => r.recurring)).toEqual([true, false, false])
      expect(rows.map((r) => r.isActive)).toEqual([true, false, true])
    })
  })

  describe('nhà cung cấp', () => {
    const URL = '/api/purchase/suppliers/import'

    it('không có cột mã → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên nhà cung cấp', 'Mã số thuế'],
        ['NCC A', '0101010101'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('map loại cá nhân/tổ chức; tên cột MST biến thể; cột thiếu → null', async () => {
      const res = await upload(URL, [
        ['Mã NCC', 'Tên', 'Loại NCC', 'MST'],
        [`${TAG}-NCC1`, 'Công ty TNHH A', 'Tổ chức', '0101010101'],
        [`${TAG}-NCC2`, 'Ông B', 'Cá nhân', null],
        [`${TAG}-NCC3`, null, 'Tổ chức', null], // thiếu tên → bỏ
      ])
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const rows = await prismaOf(app).supplier.findMany({
        where: { code: { startsWith: TAG } },
        orderBy: { code: 'asc' },
      })
      expect(rows.map((r) => r.type)).toEqual(['ORG', 'INDIVIDUAL'])
      expect(rows[0]?.taxCode).toBe('0101010101')
      expect(rows[1]?.taxCode).toBeNull()
      expect(rows[0]?.phone).toBeNull()
      expect(rows[0]?.address).toBeNull()
      expect(rows[0]?.website).toBeNull()
    })
  })
})
