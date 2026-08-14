import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Phủ nhánh parser parseCashXlsx: header lệch hàng / thiếu cột tùy chọn,
// suy ra loại nghiệp vụ từ "Loại chứng từ" vs "Lý do thu/chi", parse ngày
// (ô Date, chuỗi, giá trị hỏng) và parse số tiền (số, chuỗi có phân cách, rác).
const TAG = 'IT-CIMP'

function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const FULL_HEADER = [
  'Số chứng từ',
  'Ngày hạch toán',
  'Diễn giải',
  'Số tiền',
  'Đối tượng',
  'Lý do thu/chi',
  'Loại chứng từ',
  'Chi nhánh',
]

describe('Cash import xlsx — nhánh parser (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const importXlsx = (rows: unknown[][]) =>
    http()
      .post('/api/cash/vouchers/import')
      .set('Authorization', auth())
      .attach('file', buildXlsx(rows), 'cash.xlsx')
      .expect(201)

  const find = (voucherNo: string) =>
    prismaOf(app).cashVoucher.findFirst({ where: { voucherNo }, include: { lines: true } })

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await prisma.cashVoucher.deleteMany({ where: { voucherNo: { contains: TAG } } })
    await prisma.employee.deleteMany({ where: { code: { startsWith: TAG } } })
    await app.close()
  })

  it('không tìm thấy hàng header → không nhập dòng nào', async () => {
    const res = await importXlsx([
      ['Cột lạ', 'Cột lạ 2'],
      [`PT-${TAG}-X`, 123],
    ])
    expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
  })

  it('file rỗng → không nhập dòng nào', async () => {
    const res = await importXlsx([])
    expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
  })

  it('header nằm dưới vài dòng tiêu đề; dòng thiếu số chứng từ bị bỏ', async () => {
    const res = await importXlsx([
      ['CÔNG TY BÊ TÔNG HỒNG LĨNH'],
      ['SỔ QUỸ TIỀN MẶT'],
      [],
      FULL_HEADER,
      [null, '2026-03-10', 'Dòng không có số CT', 999, null, 'Thu khác', 'Phiếu thu', null],
      [`PT-${TAG}-H1`, '2026-03-10', 'Thu hợp lệ', 500000, 'KH A', 'Thu khác', 'Phiếu thu', 'CN1'],
    ])
    // Dòng thiếu số chứng từ bị parser loại luôn → không nằm trong total.
    expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

    const pt = await find(`PT-${TAG}-H1`)
    expect(pt?.type).toBe('RECEIPT')
    expect(pt?.partnerName).toBe('KH A')
    expect(pt?.reason).toBe('Thu khác')
    expect(pt?.lines[0]?.description).toBe('Thu hợp lệ')
    expect(pt?.branchId).toBe('CN1')
    expect(pt?.totalAmount.toString()).toBe('500000')
  })

  it('chỉ có cột bắt buộc → các trường tùy chọn null', async () => {
    const res = await importXlsx([
      ['Số chứng từ', 'Ngày hạch toán', 'Số tiền'],
      [`PC-${TAG}-MIN`, '2026-03-11', 250000],
    ])
    expect(res.body).toEqual({ total: 1, created: 1, skipped: 0 })

    const pc = await find(`PC-${TAG}-MIN`)
    expect(pc?.type).toBe('PAYMENT') // không bắt đầu bằng PT → phiếu chi
    expect(pc?.category).toBe('PAYMENT') // không có cột loại → fallback theo type
    expect(pc?.partnerName).toBeNull()
    expect(pc?.reason).toBeNull()
    expect(pc?.lines[0]?.description).toBeNull()
    expect(pc?.branchId).toBeNull()
    expect(pc?.totalAmount.toString()).toBe('250000')
  })

  describe('suy ra loại nghiệp vụ', () => {
    it('loại cụ thể ở cột "Loại chứng từ" thắng', async () => {
      await importXlsx([
        FULL_HEADER,
        [
          `PC-${TAG}-CAT1`,
          '2026-03-12',
          'Gửi ngân hàng',
          1_000_000,
          null,
          'Chi khác',
          'Gửi tiền vào ngân hàng',
          null,
        ],
      ])
      expect((await find(`PC-${TAG}-CAT1`))?.category).toBe('DEPOSIT_TO_BANK')
    })

    it('cột loại chỉ ghi loại chung → lấy loại cụ thể ở "Lý do thu/chi"', async () => {
      await importXlsx([
        FULL_HEADER,
        [
          `PC-${TAG}-CAT2`,
          '2026-03-13',
          'Tạm ứng',
          2_000_000,
          'NV A',
          'Tạm ứng cho nhân viên',
          'Phiếu chi',
          null,
        ],
      ])
      expect((await find(`PC-${TAG}-CAT2`))?.category).toBe('PAYMENT_EMPLOYEE_ADVANCE')
    })

    it('cả 2 cột đều là loại chung → giữ loại chung', async () => {
      await importXlsx([
        FULL_HEADER,
        [`PT-${TAG}-CAT3`, '2026-03-14', 'Thu chung', 300000, null, 'Thu khác', 'Phiếu thu', null],
      ])
      expect((await find(`PT-${TAG}-CAT3`))?.category).toBe('RECEIPT')
    })

    it('cả 2 cột không khớp danh mục → suy từ tiền tố PT/PC', async () => {
      await importXlsx([
        FULL_HEADER,
        [`PT-${TAG}-CAT4`, '2026-03-15', 'Lạ', 400000, null, 'Ghi chú lạ', 'Loại lạ', null],
        [`PC-${TAG}-CAT5`, '2026-03-15', 'Lạ', 400000, null, 'Ghi chú lạ', 'Loại lạ', null],
      ])
      expect((await find(`PT-${TAG}-CAT4`))?.category).toBe('RECEIPT')
      expect((await find(`PT-${TAG}-CAT4`))?.type).toBe('RECEIPT')
      expect((await find(`PC-${TAG}-CAT5`))?.category).toBe('PAYMENT')
      expect((await find(`PC-${TAG}-CAT5`))?.type).toBe('PAYMENT')
    })

    it('loại đã bỏ khỏi danh mục → quy về thu/chi khác', async () => {
      await importXlsx([
        FULL_HEADER,
        [
          `PC-${TAG}-CAT6`,
          '2026-03-16',
          'Trả lương',
          5_000_000,
          null,
          'Trả lương nhân viên',
          'Trả lương nhân viên',
          null,
        ],
      ])
      expect((await find(`PC-${TAG}-CAT6`))?.category).toBe('PAYMENT')
    })
  })

  describe('parse ngày và số tiền', () => {
    it('ô ngày kiểu Date giữ đúng ngày (không lệch múi giờ)', async () => {
      await importXlsx([
        FULL_HEADER,
        [
          `PT-${TAG}-D1`,
          new Date(Date.UTC(2026, 6, 5)),
          'Ngày Date',
          100000,
          null,
          'Thu khác',
          'Phiếu thu',
          null,
        ],
      ])
      const v = await find(`PT-${TAG}-D1`)
      expect(v?.postingDate.toISOString().slice(0, 10)).toBe('2026-07-05')
    })

    it('ngày không đọc được → lấy ngày hiện tại', async () => {
      await importXlsx([
        FULL_HEADER,
        [`PT-${TAG}-D2`, 'không phải ngày', 'Ngày hỏng', 100000, null, 'Thu khác', 'Phiếu thu', null],
      ])
      const v = await find(`PT-${TAG}-D2`)
      const today = new Date().toISOString().slice(0, 10)
      expect(v?.postingDate.toISOString().slice(0, 10)).toBe(today)
    })

    it('kỳ đã khóa sổ → dòng trong kỳ bị bỏ như dòng trùng', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: '2026-03-31' })
        .expect(200)

      const res = await importXlsx([
        FULL_HEADER,
        [`PT-${TAG}-LOCK`, '2026-03-20', 'Trong kỳ khóa', 100000, null, 'Thu khác', 'Phiếu thu', null],
        [`PT-${TAG}-FREE`, '2026-04-20', 'Ngoài kỳ khóa', 100000, null, 'Thu khác', 'Phiếu thu', null],
      ])
      expect(res.body).toEqual({ total: 2, created: 1, skipped: 1 })
      expect(await find(`PT-${TAG}-LOCK`)).toBeNull()
      expect(await find(`PT-${TAG}-FREE`)).not.toBeNull()

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })

    it('tạm ứng nhân viên → tra đối tượng trong danh mục nhân viên', async () => {
      const employee = { code: `${TAG}-NV01`, name: 'Nguyễn Văn Tạm Ứng' }
      await http()
        .post('/api/catalog/employees')
        .set('Authorization', auth())
        .send(employee)
        .expect(201)

      await importXlsx([
        FULL_HEADER,
        [
          `PC-${TAG}-EMP`,
          '2026-04-21',
          'Tạm ứng NV',
          1_000_000,
          employee.name,
          'Tạm ứng cho nhân viên',
          'Phiếu chi',
          null,
        ],
      ])
      const v = await find(`PC-${TAG}-EMP`)
      expect(v?.category).toBe('PAYMENT_EMPLOYEE_ADVANCE')
      expect(v?.partnerType).toBe('EMPLOYEE')
      expect(v?.employeeId).toBe(employee.code)
      expect(v?.partnerId).toBe(employee.code)
    })

    it('số tiền dạng chuỗi có phân cách → parse được; rác → 0', async () => {
      await importXlsx([
        FULL_HEADER,
        [`PT-${TAG}-A1`, '2026-03-17', 'Chuỗi số', '1,500,000', null, 'Thu khác', 'Phiếu thu', null],
        [`PT-${TAG}-A2`, '2026-03-17', 'Rác', 'không có số', null, 'Thu khác', 'Phiếu thu', null],
      ])
      expect((await find(`PT-${TAG}-A1`))?.totalAmount.toString()).toBe('1500000')
      expect((await find(`PT-${TAG}-A2`))?.totalAmount.toString()).toBe('0')
    })
  })
})
