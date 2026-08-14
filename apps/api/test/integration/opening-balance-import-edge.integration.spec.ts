import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Nhánh biên của 5 parser số dư đầu kỳ (spec opening-balance-import chỉ đi đường
// thành công): không tìm thấy header, thiếu cột số tiền, chỉ có cột bắt buộc,
// biến thể tên cột, và giá trị hỏng (ngày/số). Phần lớn ca dùng mã không có
// trong danh mục → service bỏ qua, không đụng số dư seed.
const TAG = 'IT-OBEDGE'

function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Opening balance import — nhánh biên parser (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const upload = (url: string, rows: unknown[][]) =>
    http()
      .post(url)
      .set('Authorization', auth())
      .attach('file', buildXlsx(rows), 'ob.xlsx')
      .expect(201)

  const EMPTY = { total: 0, created: 0, skipped: 0 }

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await prisma.accountOpeningBalance.deleteMany({ where: { accountCode: { startsWith: TAG } } })
    await prisma.fixedAssetOpeningBalance.deleteMany({ where: { code: { startsWith: TAG } } })
    await app.close()
  })

  describe('số dư tài khoản', () => {
    const URL = '/api/opening-balance/accounts/import'

    it('không có cột "Số tài khoản" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Cột lạ', 'Dư Nợ'],
        ['111', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('chỉ có cột mã → tên rỗng, 2 vế 0; dòng thiếu mã bị bỏ', async () => {
      const code = `${TAG}-A1`
      const res = await upload(URL, [
        ['Số tài khoản'],
        [code],
        [null],
      ])
      expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

      const row = await prismaOf(app).accountOpeningBalance.findUnique({
        where: { accountCode: code },
      })
      expect(row?.accountName).toBe('')
      expect(row?.debitAmount.toString()).toBe('0')
      expect(row?.creditAmount.toString()).toBe('0')
    })

    it('số dạng chuỗi có phân cách; nhập lại → skipped toàn bộ', async () => {
      const code = `${TAG}-A2`
      const rows: unknown[][] = [
        ['Số tài khoản', 'Tên tài khoản', 'Dư Nợ', 'Dư Có'],
        [code, 'TK kiểm thử', '2,500,000', 'không phải số'],
      ]
      const first = await upload(URL, rows)
      expect(first.body).toEqual({ total: 1, created: 1, skipped: 0 })

      const row = await prismaOf(app).accountOpeningBalance.findUnique({
        where: { accountCode: code },
      })
      expect(row?.debitAmount.toString()).toBe('2500000')
      expect(row?.creditAmount.toString()).toBe('0')

      const again = await upload(URL, rows)
      expect(again.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })
  })

  describe('công nợ đối tượng', () => {
    const URL = '/api/opening-balance/partners/import?accountCode=131'

    it('không có cột mã đối tượng → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên khách hàng', 'Số còn phải thu'],
        ['Khách A', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('có cột mã nhưng không có cột số tiền nào → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Mã khách hàng', 'Tên khách hàng'],
        [`${TAG}-KH`, 'Khách A'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('biến thể tên cột "Số dư nợ đầu kỳ"/"Số dư có đầu kỳ"; dòng "Tổng" bị loại', async () => {
      const res = await upload(URL, [
        ['Mã khách hàng', 'Số dư nợ đầu kỳ', 'Số dư có đầu kỳ'],
        [`${TAG}-KH1`, 5_000_000, 0],
        ['Tổng cộng', 5_000_000, 0],
      ])
      // Mã không có trong danh mục KH → parse được nhưng service bỏ qua.
      expect(res.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })

    it('biến thể cột gộp "Số tiền nợ" — ưu tiên hơn cột tách Nợ/Có', async () => {
      const res = await upload(URL, [
        ['Mã khách hàng', 'Số tiền nợ', 'Dư Nợ', 'Dư Có'],
        [`${TAG}-KH2`, 1_000_000, 9_999, 9_999],
      ])
      expect(res.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })
  })

  describe('số dư tài khoản ngân hàng', () => {
    const URL = '/api/opening-balance/bank-accounts/import?accountCode=1121'

    it('không có cột số tài khoản → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên ngân hàng', 'Dư Nợ'],
        ['Vietcombank', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('có cột số TK nhưng không có cột số tiền nào → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Số TK ngân hàng', 'Tên ngân hàng'],
        ['9999999999', 'Vietcombank'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('ưu tiên cột "Số TK ngân hàng" hơn cột "Số tài khoản" (mã TK kế toán)', async () => {
      const res = await upload(URL, [
        ['Số tài khoản', 'Số TK ngân hàng', 'Dư Nợ'],
        ['1121', `${TAG}-9999`, 1_000_000],
      ])
      // Số TK lạ → service bỏ qua; quan trọng là parser đọc đúng 1 dòng.
      expect(res.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })

    it('cột số dư gộp âm → quy về Dư Có', async () => {
      const res = await upload(URL, [
        ['Số TK ngân hàng', 'Số dư đầu kỳ'],
        [`${TAG}-8888`, -2_000_000],
      ])
      expect(res.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })
  })

  describe('tài sản cố định', () => {
    const URL = '/api/opening-balance/fixed-assets/import'

    it('không có cột "Mã tài sản" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên tài sản', 'Nguyên giá'],
        ['Máy trộn', 1000],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('thiếu tên tài sản hoặc ngày ghi tăng hỏng → bỏ dòng', async () => {
      const res = await upload(URL, [
        ['Mã tài sản', 'Tên tài sản', 'Ngày ghi tăng', 'Nguyên giá'],
        [`${TAG}-TS-NONAME`, null, '2026-01-01', 1_000_000], // thiếu tên
        [`${TAG}-TS-BADDATE`, 'Máy hỏng ngày', 'không phải ngày', 1_000_000],
        [`${TAG}-TS-OK`, 'Máy hợp lệ', new Date(Date.UTC(2026, 0, 10)), 1_000_000],
      ])
      expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

      const asset = await prismaOf(app).fixedAssetOpeningBalance.findFirst({
        where: { code: `${TAG}-TS-OK` },
      })
      expect(asset?.name).toBe('Máy hợp lệ')
      expect(asset?.acquisitionDate.toISOString().slice(0, 10)).toBe('2026-01-10')
      // Thiếu "Ngày tính KH" → lấy ngày ghi tăng.
      expect(asset?.depreciationDate.toISOString().slice(0, 10)).toBe('2026-01-10')
      // Cột không có trong file → mặc định rỗng / 0.
      expect(asset?.assetType).toBe('')
      expect(asset?.department).toBe('')
      expect(asset?.assetAccount).toBe('')
      expect(asset?.depreciationAccount).toBe('')
      expect(asset?.usefulLifeMonths.toString()).toBe('0')
      expect(asset?.remainingMonths.toString()).toBe('0')
      expect(asset?.accumulatedDepreciation.toString()).toBe('0')
    })
  })

  describe('tồn kho vật tư hàng hóa', () => {
    const URL = '/api/opening-balance/inventory/import'

    it('không có cột "Mã hàng" → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Tên hàng', 'Số lượng tồn'],
        ['Xi măng', 10],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('không có cả cột số lượng lẫn giá trị → không đọc được dòng nào', async () => {
      const res = await upload(URL, [
        ['Mã hàng', 'Tên hàng', 'Mã kho'],
        [`${TAG}-VT`, 'Xi măng', 'KHO VAT TU'],
      ])
      expect(res.body).toEqual(EMPTY)
    })

    it('mã hàng lạ → parse được nhưng service bỏ qua', async () => {
      const res = await upload(URL, [
        ['Mã hàng', 'Số lượng tồn', 'Giá trị tồn'],
        [`${TAG}-VT1`, '1,5', 3_000_000],
        [null, 10, 10],
      ])
      expect(res.body).toEqual({ total: 1, created: 0, skipped: 1 })
    })
  })
})
