import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-PIMP'

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Import danh mục đối tượng (nhân viên/TK ngân hàng/NCC/KH): parser nhận nhiều
// biến thể tên cột, service bỏ qua mã trùng (DB + trong chính file).
describe('Partner/catalog import xlsx (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await prisma.employee.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.bankAccount.deleteMany({ where: { accountNumber: { startsWith: TAG } } })
    await prisma.supplier.deleteMany({ where: { code: { startsWith: TAG } } })
    await prisma.customer.deleteMany({ where: { code: { startsWith: TAG } } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('POST /api/catalog/employees/import', () => {
    it('header biến thể (Mã NV/Tên/Phòng ban) + "Ngừng sử dụng" → isActive false; khử trùng', async () => {
      const buffer = buildXlsx([
        ['Mã NV', 'Tên', 'Chức danh', 'Phòng ban', 'Số tài khoản', 'Tên ngân hàng', 'Trạng thái'],
        [`${TAG}-NV1`, 'Nhân Viên IT 1', 'Kế toán', 'Phòng KT', '0011223344', 'VCB', 'Đang sử dụng'],
        [`${TAG}-NV2`, 'Nhân Viên IT 2', null, null, null, null, 'Ngừng sử dụng'],
        // Trùng trong chính file → bị khử.
        [`${TAG}-NV1`, 'Nhân Viên IT 1 (trùng)', null, null, null, null, null],
        // Thiếu tên → parser bỏ qua (không tính vào total).
        [`${TAG}-NV3`, null, null, null, null, null, null],
      ])

      const res = await http()
        .post('/api/catalog/employees/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'nhan-vien-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const prisma = prismaOf(app)
      const nv1 = await prisma.employee.findUnique({ where: { code: `${TAG}-NV1` } })
      expect(nv1?.name).toBe('Nhân Viên IT 1')
      expect(nv1?.isActive).toBe(true)
      const nv2 = await prisma.employee.findUnique({ where: { code: `${TAG}-NV2` } })
      expect(nv2?.isActive).toBe(false)

      // Nhập lại → skipped toàn bộ.
      const again = await http()
        .post('/api/catalog/employees/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'nhan-vien-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })
    })
  })

  describe('POST /api/catalog/bank-accounts/import', () => {
    it('khớp tên ngân hàng với danh mục Bank → gắn bankId; không khớp → null', async () => {
      const prisma = prismaOf(app)
      // Seed betonghonglinh có danh mục ngân hàng — lấy 1 bank thật để test map bankId.
      const bank = await prisma.bank.findFirst({ select: { id: true, shortName: true } })
      expect(bank).toBeTruthy()

      const buffer = buildXlsx([
        ['Số tài khoản', 'Tên ngân hàng', 'Tên chi nhánh ngân hàng', 'Chủ tài khoản', 'Trạng thái'],
        [`${TAG}0001`, bank!.shortName, 'CN Hà Nội', 'Công ty IT', 'Đang sử dụng'],
        [`${TAG}0002`, 'Ngân hàng Không Tồn Tại IT', null, null, 'Ngừng sử dụng'],
        // Thiếu tên ngân hàng → parser bỏ qua.
        [`${TAG}0003`, null, null, null, null],
      ])

      const res = await http()
        .post('/api/catalog/bank-accounts/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tk-ngan-hang-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 2, skipped: 0 })

      const matched = await prisma.bankAccount.findUnique({
        where: { accountNumber: `${TAG}0001` },
      })
      expect(matched?.bankId).toBe(bank!.id)
      expect(matched?.isActive).toBe(true)
      const unmatched = await prisma.bankAccount.findUnique({
        where: { accountNumber: `${TAG}0002` },
      })
      expect(unmatched?.bankId).toBeNull()
      expect(unmatched?.isActive).toBe(false)
    })
  })

  describe('POST /api/purchase/suppliers/import', () => {
    it('"Cá nhân" → INDIVIDUAL, còn lại → ORG; cột MST biến thể', async () => {
      const buffer = buildXlsx([
        ['Mã nhà cung cấp', 'Tên nhà cung cấp', 'Loại', 'MST', 'Địa chỉ'],
        [`${TAG}-NCC1`, 'NCC Cá Nhân IT', 'Cá nhân', '0101234567', 'Hà Nội'],
        [`${TAG}-NCC2`, 'NCC Tổ Chức IT', 'Tổ chức', null, null],
        // Trùng trong chính file → bị khử.
        [`${TAG}-NCC1`, 'NCC Cá Nhân IT (trùng)', 'Cá nhân', null, null],
      ])

      const res = await http()
        .post('/api/purchase/suppliers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'ncc-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const prisma = prismaOf(app)
      const individual = await prisma.supplier.findUnique({ where: { code: `${TAG}-NCC1` } })
      expect(individual?.type).toBe('INDIVIDUAL')
      expect(individual?.taxCode).toBe('0101234567')
      const org = await prisma.supplier.findUnique({ where: { code: `${TAG}-NCC2` } })
      expect(org?.type).toBe('ORG')
    })
  })

  describe('POST /api/sales/customers/import', () => {
    it('tạo KH mới, khử trùng trong file, nhập lại → skipped', async () => {
      const buffer = buildXlsx([
        ['Mã khách hàng', 'Tên khách hàng', 'Địa chỉ', 'Mã số thuế', 'Điện thoại'],
        [`${TAG}-KH1`, 'Khách Hàng IT 1', 'Đà Nẵng', '0309876543', '0905123456'],
        [`${TAG}-KH2`, 'Khách Hàng IT 2', null, null, null],
        // Trùng trong chính file → bị khử.
        [`${TAG}-KH1`, 'Khách Hàng IT 1 (trùng)', null, null, null],
      ])

      const res = await http()
        .post('/api/sales/customers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'kh-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const prisma = prismaOf(app)
      const kh1 = await prisma.customer.findUnique({ where: { code: `${TAG}-KH1` } })
      expect(kh1?.name).toBe('Khách Hàng IT 1')
      expect(kh1?.taxCode).toBe('0309876543')

      const again = await http()
        .post('/api/sales/customers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'kh-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })
    })
  })
})
