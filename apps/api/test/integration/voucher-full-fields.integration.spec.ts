import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { cleanVouchers, deleteCustomersByPrefix } from '../helpers/db'
import { createTestApp, loginAs, prismaOf } from '../helpers/test-app'

// Các service chứng từ đọc trường tùy chọn bằng `dto.X ?? null|undefined`; spec
// khác chỉ gửi trường tối thiểu nên nhánh "có giá trị" chưa chạy. Spec này tạo
// rồi sửa chứng từ với ĐỦ MỌI TRƯỜNG cho 5 phân hệ nhập tay: nhập kho, xuất kho,
// nghiệp vụ khác, tiền mặt, tiền gửi.
const TAG = 'IT-FULLFLD'
const YEAR = 2026
const DATE = `${YEAR}-10-10`
const DATE2 = `${YEAR}-10-11`
const CUSTOMER = { code: `${TAG}-KH01`, name: 'Khách Đủ Trường' }
const ITEM = 'BECHUADAU'
const WAREHOUSE = 'KHO VAT TU'

describe('Chứng từ nhập tay — đủ mọi trường (integration)', () => {
  let app: INestApplication
  let token: string

  const http = () => request(app.getHttpServer())
  const auth = () => `Bearer ${token}`
  const post = (url: string, body: object) =>
    http().post(url).set('Authorization', auth()).send(body).expect(201)
  const patch = (url: string, body: object) =>
    http().patch(url).set('Authorization', auth()).send(body).expect(200)

  beforeAll(async () => {
    app = await createTestApp()
    token = await loginAs(app, 'admin')
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await post('/api/sales/customers', CUSTOMER)
  })

  afterAll(async () => {
    const prisma = prismaOf(app)
    await cleanVouchers(prisma)
    await deleteCustomersByPrefix(prisma, TAG)
    await app.close()
  })

  it('phiếu nhập kho: create + update đủ trường', async () => {
    const created = await post('/api/inventory/receipts', {
      receiptType: 'PURCHASE',
      postingDate: DATE,
      voucherDate: DATE,
      partnerType: 'SUPPLIER',
      partnerId: `${TAG}-NCC`,
      partnerName: 'NCC Đủ Trường',
      address: 'Số 1 Trần Phú',
      deliverer: 'Anh Giao',
      description: `${TAG} nhập kho đủ trường`,
      reference: 'THAM-CHIEU-1',
      attachmentCount: 2,
      branchId: 'Trụ sở chính',
      lines: [
        {
          itemId: ITEM,
          itemName: 'Bể chứa nhiên liệu 15M3',
          warehouseId: WAREHOUSE,
          debitAccount: '156',
          creditAccount: '331',
          unit: 'Cái',
          quantity: 2,
          unitPrice: 3_000_000,
          lotNo: 'LO-A',
          expiryDate: `${YEAR}-12-31`,
        },
      ],
    })
    expect(created.body.partnerName).toBe('NCC Đủ Trường')
    expect(created.body.deliverer).toBe('Anh Giao')
    expect(created.body.reference).toBe('THAM-CHIEU-1')
    expect(created.body.branchId).toBe('Trụ sở chính')
    expect(created.body.totalAmount).toBe('6000000')
    expect(created.body.lines[0].lotNo).toBe('LO-A')

    const updated = await patch(`/api/inventory/receipts/${created.body.id}`, {
      postingDate: DATE2,
      voucherDate: DATE2,
      partnerType: 'SUPPLIER',
      partnerId: `${TAG}-NCC2`,
      partnerName: 'NCC Sửa',
      address: 'Số 2 Trần Phú',
      deliverer: 'Chị Giao',
      description: `${TAG} nhập kho đã sửa`,
      reference: 'THAM-CHIEU-2',
      attachmentCount: 3,
      branchId: 'Chi nhánh 1',
      lines: [
        {
          itemId: ITEM,
          itemName: 'Bể chứa nhiên liệu 15M3',
          warehouseId: WAREHOUSE,
          quantity: 1,
          unitPrice: 1_000_000,
        },
      ],
    })
    expect(updated.body.partnerName).toBe('NCC Sửa')
    expect(updated.body.reference).toBe('THAM-CHIEU-2')
    expect(updated.body.branchId).toBe('Chi nhánh 1')
    expect(updated.body.postingDate).toBe(DATE2)
    expect(updated.body.totalAmount).toBe('1000000')
    // Dòng không gửi TK → lấy TK ngầm định theo loại phiếu.
    expect(updated.body.lines[0].debitAccount).toBeTruthy()
    expect(updated.body.lines[0].creditAccount).toBeTruthy()
  })

  it('phiếu xuất kho: create + update đủ trường', async () => {
    const created = await post('/api/inventory/issues', {
      category: 'SALES',
      postingDate: DATE,
      voucherDate: DATE,
      customerId: CUSTOMER.code,
      customerName: CUSTOMER.name,
      receiver: 'Người Nhận',
      address: 'Số 3 Lê Lợi',
      salesEmployeeId: 'NV020',
      receiverId: 'NV021',
      department: 'Phòng Kho',
      description: `${TAG} xuất kho đủ trường`,
      attachmentCount: 1,
      deliveryLocation: 'Công trình A',
      lines: [
        {
          itemId: ITEM,
          itemName: 'Bể chứa nhiên liệu 15M3',
          warehouseId: WAREHOUSE,
          debitAccount: '632',
          creditAccount: '156',
          unit: 'Cái',
          quantity: 1,
          unitPrice: 2_000_000,
          lotNo: 'LO-B',
          expiryDate: `${YEAR}-12-31`,
          finishedProduct: 'Thành phẩm A',
        },
      ],
    })
    expect(created.body.customerName).toBe(CUSTOMER.name)
    expect(created.body.receiver).toBe('Người Nhận')
    expect(created.body.department).toBe('Phòng Kho')
    expect(created.body.deliveryLocation).toBe('Công trình A')

    const updated = await patch(`/api/inventory/issues/${created.body.id}`, {
      postingDate: DATE2,
      voucherDate: DATE2,
      customerId: CUSTOMER.code,
      customerName: CUSTOMER.name,
      receiver: 'Người Nhận 2',
      address: 'Số 4 Lê Lợi',
      salesEmployeeId: 'NV022',
      receiverId: 'NV023',
      department: 'Phòng Kỹ thuật',
      description: `${TAG} xuất kho đã sửa`,
      attachmentCount: 2,
      deliveryLocation: 'Công trình B',
      lines: [
        {
          itemId: ITEM,
          itemName: 'Bể chứa nhiên liệu 15M3',
          warehouseId: WAREHOUSE,
          quantity: 2,
          unitPrice: 1_000_000,
        },
      ],
    })
    expect(updated.body.receiver).toBe('Người Nhận 2')
    expect(updated.body.department).toBe('Phòng Kỹ thuật')
    expect(updated.body.deliveryLocation).toBe('Công trình B')
    expect(updated.body.postingDate).toBe(DATE2)
  })

  it('chứng từ nghiệp vụ khác: create + update đủ trường (kèm dòng thuế)', async () => {
    const created = await post('/api/general/vouchers', {
      postingDate: DATE,
      voucherDate: DATE,
      dueDate: `${YEAR}-11-10`,
      description: `${TAG} NVK đủ trường`,
      referenceNo: 'THAM-CHIEU-NVK',
      branchId: 'Trụ sở chính',
      excludeFromVatReport: true,
      lines: [
        {
          description: 'Bút toán 1',
          debitAccount: '632',
          creditAccount: '154',
          amount: 2_000_000,
          operation: 'SALES_TRADE_DISCOUNT',
          debitPartnerId: CUSTOMER.code,
          debitPartnerName: CUSTOMER.name,
          creditPartnerId: CUSTOMER.code,
          creditPartnerName: CUSTOMER.name,
        },
      ],
      taxLines: [
        {
          description: 'Thuế GTGT',
          hasInvoice: true,
          taxType: 'INPUT_INCREASE',
          taxableAmount: 1_000_000,
          vatRate: 10,
          vatAmount: 100_000,
          vatAccount: '1331',
          invoiceNo: 'HD-321',
          invoiceDate: DATE,
          goodsServiceGroup: 'Hàng hóa',
          partnerId: CUSTOMER.code,
          partnerName: CUSTOMER.name,
          supplierTaxCode: '0101010101',
        },
      ],
    })
    expect(created.body.referenceNo).toBe('THAM-CHIEU-NVK')
    expect(created.body.branchId).toBe('Trụ sở chính')
    expect(created.body.excludeFromVatReport).toBe(true)
    expect(created.body.dueDate).toBe(`${YEAR}-11-10`)
    expect(created.body.lines.length).toBeGreaterThanOrEqual(1)

    const updated = await patch(`/api/general/vouchers/${created.body.id}`, {
      postingDate: DATE2,
      voucherDate: DATE2,
      dueDate: `${YEAR}-12-10`,
      description: `${TAG} NVK đã sửa`,
      referenceNo: 'THAM-CHIEU-NVK-2',
      branchId: 'Chi nhánh 1',
      excludeFromVatReport: false,
      lines: [
        { description: 'Bút toán 2', debitAccount: '642', creditAccount: '331', amount: 500_000 },
      ],
    })
    expect(updated.body.referenceNo).toBe('THAM-CHIEU-NVK-2')
    expect(updated.body.branchId).toBe('Chi nhánh 1')
    expect(updated.body.excludeFromVatReport).toBe(false)
    expect(updated.body.totalAmount).toBe('500000')
  })

  it('phiếu chi tiền mặt: create + update đủ trường (kèm dòng thuế)', async () => {
    const created = await post('/api/cash/vouchers', {
      type: 'PAYMENT',
      category: 'PAYMENT_PURCHASE_WITH_INVOICE',
      postingDate: DATE,
      voucherDate: DATE,
      partnerType: 'SUPPLIER',
      partnerId: `${TAG}-NCC`,
      partnerName: 'NCC Đủ Trường',
      payerReceiver: 'Người Nhận Tiền',
      address: 'Số 5 Trần Hưng Đạo',
      employeeId: 'NV030',
      reason: `${TAG} chi mua hàng`,
      attachmentCount: 2,
      branchId: 'Trụ sở chính',
      lines: [
        {
          description: 'Mua vật tư',
          debitAccount: '156',
          creditAccount: '1111',
          amount: 1_000_000,
          operation: 'MUA_HANG',
          partnerId: `${TAG}-NCC`,
          partnerName: 'NCC Đủ Trường',
          costItemId: 'KMCP-1',
          bankAccountNo: '113366889999',
          bankName: 'Vietcombank',
          hasInvoice: true,
          invoiceNo: 'HD-555',
          invoiceDate: DATE,
          goodsServiceGroup: 'Hàng hóa',
          supplierTaxCode: '0101010101',
        },
        {
          description: 'Thuế GTGT đầu vào',
          debitAccount: '1331',
          creditAccount: '1111',
          amount: 100_000,
          isVatLine: true,
          vatRate: 10,
          hasInvoice: true,
          invoiceNo: 'HD-555',
          invoiceDate: DATE,
        },
      ],
    })
    expect(created.body.payerReceiver).toBe('Người Nhận Tiền')
    expect(created.body.employeeId).toBe('NV030')
    expect(created.body.branchId).toBe('Trụ sở chính')
    expect(created.body.totalAmount).toBe('1100000')

    const updated = await patch(`/api/cash/vouchers/${created.body.id}`, {
      postingDate: DATE2,
      voucherDate: DATE2,
      partnerType: 'SUPPLIER',
      partnerId: `${TAG}-NCC2`,
      partnerName: 'NCC Sửa',
      payerReceiver: 'Người Nhận Tiền 2',
      address: 'Số 6 Trần Hưng Đạo',
      employeeId: 'NV031',
      reason: `${TAG} chi đã sửa`,
      attachmentCount: 3,
      branchId: 'Chi nhánh 1',
      lines: [{ debitAccount: '642', creditAccount: '1111', amount: 200_000 }],
    })
    expect(updated.body.payerReceiver).toBe('Người Nhận Tiền 2')
    expect(updated.body.branchId).toBe('Chi nhánh 1')
    expect(updated.body.totalAmount).toBe('200000')
    expect(updated.body.postingDate).toBe(DATE2)
  })

  it('ủy nhiệm chi: create + update đủ trường', async () => {
    const created = await post('/api/bank/vouchers', {
      type: 'PAYMENT',
      category: 'PAYMENT',
      paymentMethod: 'TRANSFER',
      isBatchTransfer: true,
      internalRef: 'NOI-BO-1',
      postingDate: DATE,
      voucherDate: DATE,
      bankAccountNo: '113366889999',
      bankName: 'Vietcombank',
      receiverAccountNo: '999888777666',
      receiverBankName: 'BIDV',
      partnerType: 'SUPPLIER',
      partnerId: `${TAG}-NCC`,
      partnerName: 'NCC Đủ Trường',
      address: 'Số 7 Nguyễn Trãi',
      employeeId: 'NV040',
      reason: `${TAG} chi tiền gửi`,
      reference: 'THAM-CHIEU-NH',
      attachmentCount: 1,
      branchId: 'Trụ sở chính',
      lines: [
        {
          description: 'Chi phí dịch vụ',
          debitAccount: '642',
          creditAccount: '1121',
          amount: 2_000_000,
          partnerId: `${TAG}-NCC`,
          partnerName: 'NCC Đủ Trường',
        },
      ],
    })
    expect(created.body.bankName).toBe('Vietcombank')
    expect(created.body.receiverAccountNo).toBe('999888777666')
    expect(created.body.receiverBankName).toBe('BIDV')
    expect(created.body.reference).toBe('THAM-CHIEU-NH')
    expect(created.body.branchId).toBe('Trụ sở chính')

    const updated = await patch(`/api/bank/vouchers/${created.body.id}`, {
      postingDate: DATE2,
      voucherDate: DATE2,
      bankAccountNo: '113366889999',
      bankName: 'Vietcombank CN 2',
      receiverAccountNo: '111222333444',
      receiverBankName: 'Techcombank',
      partnerType: 'SUPPLIER',
      partnerId: `${TAG}-NCC2`,
      partnerName: 'NCC Sửa',
      address: 'Số 8 Nguyễn Trãi',
      employeeId: 'NV041',
      reason: `${TAG} chi đã sửa`,
      reference: 'THAM-CHIEU-NH-2',
      attachmentCount: 2,
      branchId: 'Chi nhánh 1',
      lines: [{ debitAccount: '642', creditAccount: '1121', amount: 500_000 }],
    })
    expect(updated.body.bankName).toBe('Vietcombank CN 2')
    expect(updated.body.receiverBankName).toBe('Techcombank')
    expect(updated.body.reference).toBe('THAM-CHIEU-NH-2')
    expect(updated.body.totalAmount).toBe('500000')
    expect(updated.body.postingDate).toBe(DATE2)
  })
})
