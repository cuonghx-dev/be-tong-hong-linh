import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { cleanVouchers, clearBookLock, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

const TAG = 'IT-BNKB'
const YEAR = 2026
const DATE = `${YEAR}-10-06`
const FAKE_ID = '00000000-0000-4000-8000-000000000000'
const BANK_ACC = '113366889999'
const CUSTOMER = { code: `${TAG}-KH01`, name: `${TAG} Khách chuyển khoản` }

/** Dựng workbook xlsx trong bộ nhớ từ mảng dòng (aoa). */
function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const receipt = (overrides: Record<string, unknown> = {}) => ({
  type: 'RECEIPT',
  category: 'RECEIPT',
  postingDate: DATE,
  voucherDate: DATE,
  bankAccountNo: BANK_ACC,
  reason: `${TAG} thu tiền gửi`,
  lines: [{ debitAccount: '1121', creditAccount: '711', amount: 2000000 }],
  ...overrides,
})

describe('Bank nhánh lỗi + nhập khẩu (integration)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    await cleanVouchers(prismaOf(app))
    await clearBookLock(prismaOf(app))
    await request(app.getHttpServer())
      .post('/api/sales/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(CUSTOMER)
      .expect(201)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await clearBookLock(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  describe('nhánh lỗi', () => {
    it('GET/PATCH/DELETE/posted id không tồn tại → 404', async () => {
      await http().get(`/api/bank/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
      await http()
        .patch(`/api/bank/vouchers/${FAKE_ID}`)
        .set('Authorization', auth())
        .send({ reason: 'x' })
        .expect(404)
      await http()
        .patch(`/api/bank/vouchers/${FAKE_ID}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(404)
      await http().delete(`/api/bank/vouchers/${FAKE_ID}`).set('Authorization', auth()).expect(404)
    })

    it('UNC thiếu TK Nợ (vế đối ứng người dùng phải chọn) → 400', async () => {
      const res = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(
          receipt({
            type: 'PAYMENT',
            category: 'PAYMENT',
            reason: `${TAG} chi thiếu TK`,
            lines: [{ debitAccount: '', creditAccount: '1121', amount: 500000 }],
          }),
        )
        .expect(400)
      expect(res.body.message).toContain('thiếu TK Nợ/Có')
    })

    it('thu tiền gửi thiếu TK Có → 400', async () => {
      await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(receipt({ lines: [{ debitAccount: '1121', creditAccount: '', amount: 500000 }] }))
        .expect(400)
    })
  })

  describe('TK tiền gửi mặc định theo loại chứng từ', () => {
    it('thu tiền gửi bỏ trống TK Nợ → mặc định 1121', async () => {
      const res = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(receipt({ lines: [{ debitAccount: '', creditAccount: '711', amount: 900000 }] }))
        .expect(201)
      expect(res.body.lines[0].debitAccount).toBe('1121')
    })

    it('UNC bỏ trống TK Có → mặc định 1121', async () => {
      const res = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(
          receipt({
            type: 'PAYMENT',
            category: 'PAYMENT',
            paymentMethod: 'TRANSFER',
            isBatchTransfer: true,
            reason: `${TAG} chi mặc định`,
            lines: [{ debitAccount: '642', creditAccount: '', amount: 700000 }],
          }),
        )
        .expect(201)
      expect(res.body.lines[0].creditAccount).toBe('1121')
      expect(res.body.paymentMethod).toBe('TRANSFER')
      expect(res.body.isBatchTransfer).toBe(true)
    })

    it('thu tiền gửi không nhận receiverAccountNo (chỉ CTNB/UNC có TK đến)', async () => {
      const res = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(
          receipt({
            receiverAccountNo: '999888777666',
            internalRef: 'REF-01',
            reason: `${TAG} thu có ref`,
          }),
        )
        .expect(201)
      expect(res.body.receiverAccountNo).toBeNull()
      expect(res.body.internalRef).toBe('REF-01')
    })
  })

  describe('update giữ đúng trường theo loại chứng từ', () => {
    it('sửa UNC: đổi paymentMethod + lines tính lại tổng, số chứng từ giữ nguyên', async () => {
      const created = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(
          receipt({
            type: 'PAYMENT',
            category: 'PAYMENT',
            paymentMethod: 'UNC',
            reason: `${TAG} chi sửa`,
            lines: [{ debitAccount: '642', creditAccount: '1121', amount: 500000 }],
          }),
        )
        .expect(201)

      const updated = await http()
        .patch(`/api/bank/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({
          paymentMethod: 'CHECK',
          lines: [
            { debitAccount: '642', creditAccount: '1121', amount: 300000 },
            { debitAccount: '811', creditAccount: '1121', amount: 200000 },
          ],
        })
        .expect(200)
      expect(updated.body.paymentMethod).toBe('CHECK')
      expect(updated.body.totalAmount).toBe('500000')
      expect(updated.body.voucherNo).toBe(created.body.voucherNo)
    })

    it('sửa header thu tiền gửi (không kèm lines) → tổng tiền giữ nguyên', async () => {
      const created = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(receipt({ reason: `${TAG} thu sửa header` }))
        .expect(201)

      const updated = await http()
        .patch(`/api/bank/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ partnerName: 'Đối tượng mới', address: 'Số 3 Hà Nội' })
        .expect(200)
      expect(updated.body.partnerName).toBe('Đối tượng mới')
      expect(updated.body.totalAmount).toBe('2000000')
    })
  })

  describe('list filter + import xlsx + khóa sổ', () => {
    it('lọc theo type/category/bankAccountNo/ngày/keyword', async () => {
      const res = await http()
        .get(
          `/api/bank/vouchers?type=RECEIPT&category=RECEIPT&bankAccountNo=${BANK_ACC}&fromDate=${YEAR}-01-01&toDate=${YEAR}-12-31&keyword=${TAG}&pageSize=50`,
        )
        .set('Authorization', auth())
        .expect(200)
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1)
    })

    it('import: thu + chi mới, trùng trong file bị khử; nhập lại → skipped hết', async () => {
      const header = [
        'Số chứng từ',
        'Ngày hạch toán',
        'Diễn giải',
        'Số tiền',
        'Đối tượng',
        'Số tài khoản NH',
        'Lý do thu/chi',
        'Loại chứng từ',
        'Chi nhánh',
      ]
      const buffer = buildXlsx([
        header,
        [`NTTK-${TAG}-01`, '2026-10-01', 'Thu tiền gửi nhập khẩu', 5000000, CUSTOMER.name, BANK_ACC, 'Thu khác', 'Thu tiền gửi', null],
        [`UNC-${TAG}-01`, '2026-10-02', 'Chi tiền gửi nhập khẩu', 3000000, null, BANK_ACC, 'Chi khác', 'Ủy nhiệm chi', null],
        [`NTTK-${TAG}-01`, '2026-10-01', 'Trùng trong file', 5000000, null, BANK_ACC, 'Thu khác', 'Thu tiền gửi', null],
      ])

      const first = await http()
        .post('/api/bank/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tien-gui-it.xlsx')
        .expect(201)
      expect(first.body).toEqual({ total: 3, created: 2, skipped: 1 })

      const again = await http()
        .post('/api/bank/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buffer, 'tien-gui-it.xlsx')
        .expect(201)
      expect(again.body).toEqual({ total: 3, created: 0, skipped: 3 })

      const prisma = prismaOf(app)
      // Thu: Nợ 1121 / Có TK đối ứng theo loại đối tượng (KH → 131).
      const inbound = await prisma.bankVoucher.findFirst({
        where: { voucherNo: `NTTK-${TAG}-01` },
        include: { lines: true },
      })
      expect(inbound!.type).toBe('RECEIPT')
      expect(inbound!.lines[0]!.debitAccount).toBe('1121')
      expect(inbound!.lines[0]!.creditAccount).toBe('131')

      // Chi: Nợ TK đối ứng (không có đối tượng → 331) / Có 1121.
      const outbound = await prisma.bankVoucher.findFirst({
        where: { voucherNo: `UNC-${TAG}-01` },
        include: { lines: true },
      })
      expect(outbound!.type).toBe('PAYMENT')
      expect(outbound!.lines[0]!.debitAccount).toBe('331')
      expect(outbound!.lines[0]!.creditAccount).toBe('1121')
    })

    it('file không có header hợp lệ → total 0', async () => {
      const res = await http()
        .post('/api/bank/vouchers/import')
        .set('Authorization', auth())
        .attach('file', buildXlsx([['Cột lạ'], ['x']]), 'rong.xlsx')
        .expect(201)
      expect(res.body).toEqual({ total: 0, created: 0, skipped: 0 })
    })

    it('import bỏ qua chứng từ trong kỳ đã khóa sổ', async () => {
      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: `${YEAR}-02-28` })
        .expect(200)

      const res = await http()
        .post('/api/bank/vouchers/import')
        .set('Authorization', auth())
        .attach(
          'file',
          buildXlsx([
            ['Số chứng từ', 'Ngày hạch toán', 'Diễn giải', 'Số tiền', 'Số tài khoản NH', 'Loại chứng từ'],
            [`NTTK-${TAG}-LOCK`, '2026-01-15', 'Trong kỳ khóa', 1000000, BANK_ACC, 'Thu tiền gửi'],
            [`NTTK-${TAG}-OPEN`, '2026-09-15', 'Ngoài kỳ khóa', 2000000, BANK_ACC, 'Thu tiền gửi'],
          ]),
          'tien-gui-lock.xlsx',
        )
        .expect(201)
      expect(res.body).toEqual({ total: 2, created: 1, skipped: 1 })

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })

    it('khóa sổ chặn create / update / posted / delete chứng từ tiền gửi', async () => {
      const created = await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(receipt({ postingDate: `${YEAR}-01-20`, voucherDate: `${YEAR}-01-20` }))
        .expect(201)

      await http()
        .put('/api/book-lock')
        .set('Authorization', auth())
        .send({ lockDate: `${YEAR}-02-28` })
        .expect(200)

      await http()
        .post('/api/bank/vouchers')
        .set('Authorization', auth())
        .send(receipt({ postingDate: `${YEAR}-01-25`, voucherDate: `${YEAR}-01-25` }))
        .expect(400)
      await http()
        .patch(`/api/bank/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .send({ reason: 'sửa trong kỳ khóa' })
        .expect(400)
      await http()
        .patch(`/api/bank/vouchers/${created.body.id}/posted`)
        .set('Authorization', auth())
        .send({ posted: false })
        .expect(400)
      await http()
        .delete(`/api/bank/vouchers/${created.body.id}`)
        .set('Authorization', auth())
        .expect(400)

      await http().delete('/api/book-lock').set('Authorization', auth()).expect(200)
    })
  })
})
