import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-IMP'
const FIXTURE_DIR = path.resolve(__dirname, '../../prisma/initial-databases/betonghonglinh/data')

// Mỗi endpoint import danh mục nhập lại chính fixture seed → idempotent:
// parser chạy toàn bộ file thật, service bỏ qua 100% bản ghi đã tồn tại.
// (units đã có test riêng trong catalog.integration.spec.ts)
const FIXTURE_IMPORTS: Array<{ route: string; file: string }> = [
  { route: '/api/catalog/organization-units/import', file: 'Danh_sach_co_cau_to_chuc.xlsx' },
  { route: '/api/catalog/accounts/import', file: 'Danh_sach_he_thong_tai_khoan_.xlsx' },
  { route: '/api/catalog/transfer-accounts/import', file: 'Danh_sach_tai_khoan_ket_chuyen.xlsx' },
  { route: '/api/catalog/default-accounts/import', file: 'Danh_sach_tai_khoan_ngam_dinh.xlsx' },
  { route: '/api/catalog/warehouses/import', file: 'Danh_sach_kho.xlsx' },
  { route: '/api/catalog/product-groups/import', file: 'Danh_sach_nhom_vat_tu_hang_hoa_dich_vu.xlsx' },
  { route: '/api/catalog/banks/import', file: 'Danh_sach_ngan_hang.xlsx' },
  { route: '/api/catalog/partner-groups/import', file: 'Danh_sach_nhom_khach_hang_nha_cung_cap.xlsx' },
  { route: '/api/catalog/expense-items/import', file: 'Danh_sach_khoan_muc_chi_phi_.xlsx' },
  { route: '/api/catalog/cost-objects/import', file: 'Doi_tuong_tap_hop_chi_phi.xlsx' },
  { route: '/api/catalog/products/import', file: 'Danh_sach_hang_hoa_dich_vu.xlsx' },
  { route: '/api/catalog/income-expense-items/import', file: 'Danh_sach_muc_thuchi.xlsx' },
  { route: '/api/catalog/voucher-types/import', file: 'Danh_sach_loai_chung_tu.xlsx' },
  { route: '/api/opening-balance/accounts/import', file: 'Danh_sach_so_du_tai_khoan.xlsx' },
]

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Catalog import xlsx (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await prisma.unit.deleteMany({ where: { name: { startsWith: TAG } } })
    await prisma.cashVoucherLine.deleteMany({
      where: { voucher: { voucherNo: { contains: TAG } } },
    })
    await prisma.cashVoucher.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe.each(FIXTURE_IMPORTS)('POST $route', ({ route, file }) => {
    it('nhập lại fixture seed → idempotent (created 0, skipped = total)', async () => {
      const res = await http()
        .post(route)
        .set('Authorization', auth())
        .attach('file', readFileSync(path.join(FIXTURE_DIR, file)), file)
        .expect(201)
      expect(res.body.created).toBe(0)
      expect(res.body.skipped).toBeGreaterThan(0)
      expect(res.body.total).toBe(res.body.created + res.body.skipped)
    })
  })

  describe('nhánh tạo mới + khử trùng trong file (đơn vị tính)', () => {
    it('2 dòng mới (1 ngừng sử dụng) + 1 dòng trùng trong file → created 2, skipped 1', async () => {
      const buffer = buildXlsx([
        ['Đơn vị tính', 'Mô tả', 'Trạng thái'],
        [`${TAG}-DVT-1`, 'đvt kiểm thử', 'Đang sử dụng'],
        [`${TAG}-DVT-2`, null, 'Ngừng sử dụng'],
        [`${TAG}-DVT-1`, 'trùng trong file', 'Đang sử dụng'],
      ])
      const res = await http()
        .post('/api/catalog/units/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'don-vi-tinh-it.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const inactive = await prismaOf(app).unit.findUnique({
        where: { name: `${TAG}-DVT-2` },
      })
      expect(inactive?.isActive).toBe(false)
    })

    it('file không có header hợp lệ → total 0', async () => {
      const res = await http()
        .post('/api/catalog/units/import')
        .set('Authorization', auth())
        .attach('file', buildXlsx([['Cột lạ'], ['x']]), 'rong.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
    })
  })

  describe('nhập chứng từ thu/chi tiền mặt (cash)', () => {
    const CASH_HEADER = [
      'Số chứng từ',
      'Ngày hạch toán',
      'Diễn giải',
      'Số tiền',
      'Đối tượng',
      'Lý do thu/chi',
      'Loại chứng từ',
    ]

    it('file mới → tạo phiếu; nhập lại chính file → skipped toàn bộ', async () => {
      const buffer = buildXlsx([
        CASH_HEADER,
        [`PT-${TAG}-001`, '2026-03-10', 'Thu kiểm thử', 150000, null, 'Thu khác', 'Phiếu thu'],
        [`PC-${TAG}-001`, '2026-03-11', 'Chi kiểm thử', 90000, null, 'Chi khác', 'Phiếu chi'],
        // Trùng trong chính file → bị khử.
        [`PT-${TAG}-001`, '2026-03-10', 'Thu kiểm thử (trùng)', 150000, null, 'Thu khác', 'Phiếu thu'],
      ])

      const first = await http()
        .post('/api/cash/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'cash-it.xlsx')
        .expect(201)
      expect(first.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const again = await http()
        .post('/api/cash/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'cash-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })

      // Phiếu thu nhập từ file định khoản mặc định Nợ 1111 / Có 711 (Thu khác).
      const pt = await prismaOf(app).cashVoucher.findFirst({
        where: { voucherNo: `PT-${TAG}-001` },
        include: { lines: true },
      })
      expect(pt?.type).toBe('RECEIPT')
      expect(pt?.lines.length).toBeGreaterThan(0)
    })
  })
})
