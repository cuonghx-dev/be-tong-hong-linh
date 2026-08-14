import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { deleteSuppliersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Mỗi parser import đọc cột tùy chọn bằng `iX >= 0 ? ... : null`. Các spec khác
// đã phủ nhánh "thiếu cột"; spec này nạp file có ĐỦ MỌI CỘT (giá trị thật) để
// phủ nhánh còn lại, cho toàn bộ danh mục + chứng từ có nhập khẩu Excel.
const TAG = 'IT-FULLCOL'

function buildXlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Import xlsx — file đủ mọi cột (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`

  const upload = (url: string, rows: unknown[][]) =>
    http()
      .post(url)
      .set('Authorization', auth())
      .attach('file', buildXlsx(rows), 'full.xlsx')
      .expect(201)

  const ONE_CREATED = { total: 1, created: 1, skipped: 0 }

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    const byCode = { code: { startsWith: TAG } }
    await prisma.account.deleteMany({ where: { number: { startsWith: TAG } } })
    await prisma.bankAccount.deleteMany({ where: { accountNumber: { startsWith: TAG } } })
    await prisma.product.deleteMany({ where: byCode })
    await prisma.warehouse.deleteMany({ where: byCode })
    await prisma.employee.deleteMany({ where: byCode })
    await prisma.costObject.deleteMany({ where: byCode })
    await prisma.incomeExpenseItem.deleteMany({ where: byCode })
    await prisma.transferAccount.deleteMany({ where: byCode })
    await prisma.defaultAccount.deleteMany({ where: { name: { startsWith: TAG } } })
    await deleteSuppliersByPrefix(prisma, TAG)

    const byNo = { voucherNo: { contains: TAG } }
    await prisma.purchaseVoucher.deleteMany({ where: byNo })
    await prisma.salesVoucher.deleteMany({ where: byNo })
    await prisma.bankVoucher.deleteMany({ where: byNo })
    await prisma.cashVoucher.deleteMany({ where: byNo })
    await prisma.inventoryReceipt.deleteMany({ where: byNo })
    await prisma.goodsIssueVoucher.deleteMany({ where: byNo })
    await prisma.generalVoucher.deleteMany({ where: byNo })
    await app.close()
  })

  describe('danh mục', () => {
    it('hệ thống tài khoản: đủ cột', async () => {
      const res = await upload('/api/catalog/accounts/import', [
        ['Số tài khoản', 'Tên tài khoản', 'Tính chất', 'Tên tiếng Anh', 'Diễn giải', 'Trạng thái'],
        [`${TAG}1`, 'TK kiểm thử', 'Dư Nợ', 'Test account', 'Diễn giải TK', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const acc = await prismaOf(app).account.findFirst({ where: { number: `${TAG}1` } })
      expect(acc?.name).toBe('TK kiểm thử')
      expect(acc?.nameEn).toBe('Test account')
      expect(acc?.description).toBe('Diễn giải TK')
      expect(acc?.isActive).toBe(true)
    })

    it('tài khoản ngân hàng: đủ cột', async () => {
      const res = await upload('/api/catalog/bank-accounts/import', [
        [
          'Số tài khoản',
          'Tên ngân hàng',
          'Tên chi nhánh ngân hàng',
          'Chủ tài khoản',
          'Chi nhánh',
          'Trạng thái',
        ],
        [`${TAG}-TK01`, 'Vietcombank', 'CN Hà Tĩnh', 'CT Bê Tông', 'Trụ sở chính', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const tk = await prismaOf(app).bankAccount.findFirst({
        where: { accountNumber: `${TAG}-TK01` },
      })
      expect(tk?.bankBranch).toBe('CN Hà Tĩnh')
      expect(tk?.accountHolder).toBe('CT Bê Tông')
      expect(tk?.branch).toBe('Trụ sở chính')
      expect(tk?.isActive).toBe(true)
    })

    it('kho: đủ cột', async () => {
      const res = await upload('/api/catalog/warehouses/import', [
        ['Mã kho', 'Tên kho', 'Địa chỉ', 'Chi nhánh', 'Trạng thái'],
        [`${TAG}-KHO`, 'Kho kiểm thử', 'Số 1 Trần Phú', 'Trụ sở chính', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const kho = await prismaOf(app).warehouse.findFirst({ where: { code: `${TAG}-KHO` } })
      expect(kho?.address).toBe('Số 1 Trần Phú')
      expect(kho?.branch).toBe('Trụ sở chính')
      expect(kho?.isActive).toBe(true)
    })

    it('vật tư hàng hóa: đủ cột', async () => {
      const res = await upload('/api/catalog/products/import', [
        [
          'Mã',
          'Tên',
          'Tính chất',
          'Nhóm VTHH',
          'Đơn vị tính chính',
          'Mô tả',
          'Diễn giải khi mua',
          'Diễn giải khi bán',
          'Mã kho ngầm định',
          'Kho ngầm định',
          'TK Kho',
          'TK Doanh thu',
          'TK chiết khấu',
          'TK Trả lại',
          'TK chi phí',
          'Đơn giá mua gần nhất',
          'Đơn giá bán 1',
          'Số lượng tồn tối thiểu',
          'Thuế suất GTGT',
          'Giảm thuế theo quy định',
          'Trạng thái',
        ],
        [
          `${TAG}-VT01`,
          'Vật tư kiểm thử',
          'Hàng hóa',
          'NHOM1',
          'Cái',
          'Mô tả VT',
          'Mua vật tư',
          'Bán vật tư',
          'KHO VAT TU',
          'KHO VẬT TƯ',
          '156',
          '511',
          '521',
          '531',
          '632',
          '1000000',
          '1500000',
          '5',
          '10%',
          'Có',
          'Đang sử dụng',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const vt = await prismaOf(app).product.findFirst({ where: { code: `${TAG}-VT01` } })
      expect(vt?.name).toBe('Vật tư kiểm thử')
      expect(vt?.unit).toBe('Cái')
      expect(vt?.description).toBe('Mô tả VT')
      expect(vt?.purchaseDescription).toBe('Mua vật tư')
      expect(vt?.saleDescription).toBe('Bán vật tư')
      expect(vt?.defaultWarehouseCode).toBe('KHO VAT TU')
      expect(vt?.inventoryAccount).toBe('156')
      expect(vt?.revenueAccount).toBe('511')
      expect(vt?.discountAccount).toBe('521')
      expect(vt?.saleReturnAccount).toBe('531')
      expect(vt?.costAccount).toBe('632')
      expect(Number(vt?.purchasePrice)).toBe(1_000_000)
      expect(Number(vt?.salePrice)).toBe(1_500_000)
      expect(Number(vt?.minStock)).toBe(5)
    })

    it('nhân viên: đủ cột', async () => {
      const res = await upload('/api/catalog/employees/import', [
        [
          'Mã nhân viên',
          'Tên nhân viên',
          'Chức danh',
          'Tên đơn vị',
          'Số tài khoản',
          'Tên ngân hàng',
          'Trạng thái',
        ],
        [
          `${TAG}-NV01`,
          'Trần Thị B',
          'Kế toán trưởng',
          'Phòng Kế toán',
          '0123456789',
          'Vietcombank',
          'Đang sử dụng',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const nv = await prismaOf(app).employee.findFirst({ where: { code: `${TAG}-NV01` } })
      expect(nv?.title).toBe('Kế toán trưởng')
      expect(nv?.department).toBe('Phòng Kế toán')
      expect(nv?.bankAccount).toBe('0123456789')
      expect(nv?.bankName).toBe('Vietcombank')
    })

    it('đối tượng tập hợp chi phí: đủ cột', async () => {
      const res = await upload('/api/catalog/cost-objects/import', [
        ['Mã đối tượng THCP', 'Tên đối tượng THCP', 'Loại', 'Diễn giải', 'Trạng thái'],
        [`${TAG}-CO01`, 'Công trình A', 'Sản phẩm', 'Diễn giải CT', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const co = await prismaOf(app).costObject.findFirst({ where: { code: `${TAG}-CO01` } })
      expect(co?.description).toBe('Diễn giải CT')
      expect(co?.type).toBe('PRODUCT')
    })

    it('mục thu/chi: đủ cột', async () => {
      const res = await upload('/api/catalog/income-expense-items/import', [
        ['Mã mục thu/chi', 'Tên mục thu/chi', 'Loại', 'Phát sinh định kỳ', 'Trạng thái'],
        [`${TAG}-MTC01`, 'Thu lãi tiền gửi', 'Mục thu', 'x', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const mtc = await prismaOf(app).incomeExpenseItem.findFirst({
        where: { code: `${TAG}-MTC01` },
      })
      expect(mtc?.type).toBe('INCOME')
      expect(mtc?.recurring).toBe(true)
      expect(mtc?.isActive).toBe(true)
    })

    it('nhà cung cấp: đủ cột', async () => {
      const res = await upload('/api/purchase/suppliers/import', [
        [
          'Mã nhà cung cấp',
          'Tên nhà cung cấp',
          'Loại',
          'Mã số thuế/CCCD chủ hộ',
          'Mã số ĐVQHNS',
          'Điện thoại',
          'Website',
          'Địa chỉ',
          'Rủi ro về hóa đơn',
        ],
        [
          `${TAG}-NCC01`,
          'Công ty CP Kiểm Thử',
          'Tổ chức',
          '0101010101',
          'DVQHNS-1',
          '0912345678',
          'https://example.vn',
          'Số 2 Lê Lợi',
          'Không',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const ncc = await prismaOf(app).supplier.findFirst({ where: { code: `${TAG}-NCC01` } })
      expect(ncc?.taxCode).toBe('0101010101')
      expect(ncc?.budgetRelationCode).toBe('DVQHNS-1')
      expect(ncc?.phone).toBe('0912345678')
      expect(ncc?.website).toBe('https://example.vn')
      expect(ncc?.address).toBe('Số 2 Lê Lợi')
      expect(ncc?.invoiceRisk).toBe('Không')
    })

    it('tài khoản kết chuyển: đủ cột', async () => {
      const res = await upload('/api/catalog/transfer-accounts/import', [
        [
          'Thứ tự kết chuyển',
          'Mã kết chuyển',
          'Kết chuyển từ',
          'Kết chuyển đến',
          'Bên kết chuyển',
          'Diễn giải',
          'Trạng thái',
        ],
        [3, `${TAG}-KC01`, '632', '911', 'Nợ', 'Kết chuyển giá vốn', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const kc = await prismaOf(app).transferAccount.findFirst({ where: { code: `${TAG}-KC01` } })
      expect(kc?.order).toBe(3)
      expect(kc?.side).toBe('DEBIT')
      expect(kc?.description).toBe('Kết chuyển giá vốn')
    })

    it('tài khoản ngầm định: đủ cột', async () => {
      const res = await upload('/api/catalog/default-accounts/import', [
        ['STT', 'Loại', 'TK Nợ', 'TK Có', 'Trạng thái'],
        [4, `${TAG} thu tiền bán hàng`, '1111', '511', 'Đang sử dụng'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const da = await prismaOf(app).defaultAccount.findFirst({
        where: { name: { startsWith: TAG } },
      })
      expect(da?.order).toBe(4)
      expect(da?.debitAccount).toBe('1111')
      expect(da?.creditAccount).toBe('511')
    })
  })

  describe('chứng từ', () => {
    const DATE = '2026-09-10'

    it('thu/chi tiền mặt: đủ cột', async () => {
      const res = await upload('/api/cash/vouchers/import', [
        [
          'Số chứng từ',
          'Ngày hạch toán',
          'Diễn giải',
          'Số tiền',
          'Đối tượng',
          'Lý do thu/chi',
          'Loại chứng từ',
          'Chi nhánh',
        ],
        [
          `PT-${TAG}-01`,
          DATE,
          'Diễn giải phiếu thu',
          1_500_000,
          'Khách lẻ',
          'Thu khác',
          'Phiếu thu',
          'Trụ sở chính',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const pt = await prismaOf(app).cashVoucher.findFirst({
        where: { voucherNo: `PT-${TAG}-01` },
        include: { lines: true },
      })
      expect(pt?.partnerName).toBe('Khách lẻ')
      expect(pt?.reason).toBe('Thu khác')
      expect(pt?.branchId).toBe('Trụ sở chính')
      expect(pt?.lines[0]?.description).toBe('Diễn giải phiếu thu')
    })

    it('thu/chi tiền gửi: đủ cột', async () => {
      const res = await upload('/api/bank/vouchers/import', [
        [
          'Số chứng từ',
          'Ngày hạch toán',
          'Diễn giải',
          'Số tiền',
          'Đối tượng',
          'Số tài khoản NH',
          'Lý do thu/chi',
          'Loại chứng từ',
          'Chi nhánh',
        ],
        [
          `NTTK-${TAG}-01`,
          DATE,
          'Diễn giải NTTK',
          2_500_000,
          'Khách lẻ',
          '113366889999',
          'Thu tiền gửi',
          'Thu tiền gửi',
          'Trụ sở chính',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const v = await prismaOf(app).bankVoucher.findFirst({
        where: { voucherNo: `NTTK-${TAG}-01` },
      })
      expect(v?.partnerName).toBe('Khách lẻ')
      expect(v?.bankAccountNo).toBe('113366889999')
      expect(v?.reason).toBe('Thu tiền gửi')
      expect(v?.branchId).toBe('Trụ sở chính')
      expect(v?.category).toBe('RECEIPT')
    })

    it('mua hàng: đủ cột', async () => {
      const res = await upload('/api/purchase/vouchers/import', [
        [
          'Số chứng từ',
          'Ngày hạch toán',
          'Số hóa đơn',
          'Nhà cung cấp',
          'Tổng tiền thanh toán',
          'Chi phí mua hàng',
          'Giá trị nhập kho',
          'TT nhận hóa đơn',
          'TT thanh toán',
          'Chi nhánh',
        ],
        [
          `NK-${TAG}-01`,
          DATE,
          'HD-999',
          'NCC Kiểm Thử',
          11_000_000,
          1_000_000,
          11_000_000,
          'Đã nhận hóa đơn',
          'Đã thanh toán',
          'Trụ sở chính',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const v = await prismaOf(app).purchaseVoucher.findFirst({
        where: { voucherNo: `NK-${TAG}-01` },
      })
      expect(v?.invoiceNo).toBe('HD-999')
      expect(v?.supplierName).toBe('NCC Kiểm Thử')
      expect(v?.branchId).toBe('Trụ sở chính')
      expect(v?.receiveStatus).toBe('RECEIVED')
      expect(v?.paymentStatus).toBe('PAID')
      expect(v?.type).toBe('STOCK')
    })

    it('bán hàng: đủ cột', async () => {
      const res = await upload('/api/sales/vouchers/import', [
        [
          'Số chứng từ',
          'Số hóa đơn',
          'Ngày hạch toán',
          'Khách hàng',
          'Tổng tiền thanh toán',
          'TT lập hóa đơn',
          'TT thanh toán',
          'TT xuất hàng',
          'Chi nhánh',
        ],
        [
          `BH-${TAG}-01`,
          'HD-888',
          DATE,
          'Khách Kiểm Thử',
          7_700_000,
          'Đã lập hóa đơn',
          'Đã thanh toán',
          'Đã xuất kho',
          'Trụ sở chính',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const v = await prismaOf(app).salesVoucher.findFirst({
        where: { voucherNo: `BH-${TAG}-01` },
      })
      expect(v?.invoiceNo).toBe('HD-888')
      expect(v?.customerName).toBe('Khách Kiểm Thử')
      expect(v?.branchId).toBe('Trụ sở chính')
      expect(v?.withInvoice).toBe(true)
      expect(v?.paymentMode).toBe('PAID_NOW')
    })

    it('nhập kho: đủ cột', async () => {
      const res = await upload('/api/inventory/receipts/import', [
        [
          'Ngày hạch toán',
          'Số chứng từ',
          'Diễn giải',
          'Tổng tiền',
          'Người giao',
          'Loại chứng từ',
          'Chi nhánh',
        ],
        [
          DATE,
          `NK-${TAG}-KHO`,
          'Nhập kho kiểm thử',
          6_000_000,
          'Anh Giao',
          'Nhập kho thành phẩm',
          'Trụ sở chính',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const v = await prismaOf(app).inventoryReceipt.findFirst({
        where: { voucherNo: `NK-${TAG}-KHO` },
      })
      expect(v?.description).toBe('Nhập kho kiểm thử')
      expect(v?.deliverer).toBe('Anh Giao')
      expect(v?.branchId).toBe('Trụ sở chính')
      expect(v?.receiptType).toBe('FINISHED_GOODS')
    })

    it('xuất kho: đủ cột', async () => {
      const res = await upload('/api/inventory/issues/import', [
        [
          'Ngày hạch toán',
          'Số chứng từ',
          'Diễn giải',
          'Tổng tiền',
          'Người nhận',
          'Đã lập CT bán hàng',
          'TT Phát hành hóa đơn',
          'Mã CQT cấp',
          'Loại chứng từ',
        ],
        [
          DATE,
          `XK-${TAG}-KHO`,
          'Xuất kho kiểm thử',
          4_000_000,
          'Chị Nhận',
          'Đã lập',
          'Đã phát hành',
          'CQT-123',
          'Xuất kho sản xuất',
        ],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const v = await prismaOf(app).goodsIssueVoucher.findFirst({
        where: { voucherNo: `XK-${TAG}-KHO` },
      })
      expect(v?.description).toBe('Xuất kho kiểm thử')
      expect(v?.receiver).toBe('Chị Nhận')
      expect(v?.salesDocStatus).toBe('Đã lập')
      expect(v?.invoiceIssueStatus).toBe('Đã phát hành')
      expect(v?.taxAuthorityCode).toBe('CQT-123')
      expect(v?.category).toBe('PRODUCTION')
    })

    it('nghiệp vụ khác: đủ cột', async () => {
      const res = await upload('/api/general/vouchers/import', [
        ['Số chứng từ', 'Ngày hạch toán', 'Ngày chứng từ', 'Diễn giải', 'Số tiền', 'Chi nhánh'],
        [`NVK-${TAG}-01`, DATE, '2026-09-09', 'Bút toán kiểm thử', 3_300_000, 'Trụ sở chính'],
      ])
      expect(res.body).toEqual(ONE_CREATED)

      const v = await prismaOf(app).generalVoucher.findFirst({
        where: { voucherNo: `NVK-${TAG}-01` },
      })
      expect(v?.description).toBe('Bút toán kiểm thử')
      expect(v?.branchId).toBe('Trụ sở chính')
      expect(v?.postingDate.toISOString().slice(0, 10)).toBe(DATE)
      expect(v?.voucherDate.toISOString().slice(0, 10)).toBe('2026-09-09')
    })
  })
})
