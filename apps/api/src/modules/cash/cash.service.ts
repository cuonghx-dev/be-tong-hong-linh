import {
  CASH_PAYMENT_DEBIT_ACCOUNT,
  CASH_RECEIPT_CREDIT_ACCOUNT,
  CHART_OF_ACCOUNTS,
  type Paginated,
} from '@app/shared'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  CashVoucherCategory,
  CashVoucherType,
  PartnerType,
  Prisma,
  type CashVoucher,
  type CashVoucherLine,
  type PurchaseVoucherType,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { buildPartnerLookup } from '../../database/partner-lookup'
import { BookLockService } from '../book-lock/book-lock.service'
import { parseCashXlsx } from './cash-import'
import { CashVoucherFilterDto } from './dto/cash-voucher-filter.dto'
import { CreateCashVoucherDto, CreateCashVoucherLineDto } from './dto/create-cash-voucher.dto'
import { UpdateCashVoucherDto } from './dto/update-cash-voucher.dto'

type VoucherWithLines = CashVoucher & { lines: CashVoucherLine[] }

// Loại nghiệp vụ mà đối tượng là nhân viên (tạm ứng / trả lương tạm ứng).
const EMPLOYEE_CATEGORIES = new Set<CashVoucherCategory>([
  CashVoucherCategory.PAYMENT_EMPLOYEE_ADVANCE,
  CashVoucherCategory.PAYMENT_SALARY_ADVANCE,
])

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  async list(filter: CashVoucherFilterDto): Promise<Paginated<ReturnType<typeof toVoucherDto>>> {
    const where: Prisma.CashVoucherWhereInput = {}
    if (filter.type) where.type = filter.type
    if (filter.category) where.category = filter.category
    if (filter.partnerId) where.partnerId = filter.partnerId
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { reason: { contains: filter.keyword, mode: 'insensitive' } },
        { partnerName: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.cashVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        // voucherNo (unique) làm tiebreaker: createdAt trùng nhau hàng loạt với dữ liệu
        // nhập Excel → thiếu nó thứ tự các dòng hòa không ổn định, UPDATE (vd. bỏ ghi/
        // ghi sổ) làm bảng xáo hàng sau mỗi refetch.
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }, { voucherNo: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.cashVoucher.count({ where }),
    ])

    const [salesByReceipt, purchaseByPayment] = await Promise.all([
      this.lookupSalesVouchers(rows),
      this.lookupPurchaseVouchers(rows),
    ])
    return {
      data: rows.map((r) => ({
        ...toVoucherDto(r),
        salesVoucherId: salesByReceipt.get(r.id) ?? null,
        purchaseVoucherId: purchaseByPayment.get(r.id)?.id ?? null,
        purchaseVoucherType: purchaseByPayment.get(r.id)?.type ?? null,
      })),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.cashVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy phiếu ${id}`)
    const [salesByReceipt, purchaseByPayment] = await Promise.all([
      this.lookupSalesVouchers([voucher]),
      this.lookupPurchaseVouchers([voucher]),
    ])
    return {
      ...toVoucherDto(voucher),
      salesVoucherId: salesByReceipt.get(voucher.id) ?? null,
      purchaseVoucherId: purchaseByPayment.get(voucher.id)?.id ?? null,
      purchaseVoucherType: purchaseByPayment.get(voucher.id)?.type ?? null,
    }
  }

  // PT SALES_CASH tự sinh → tìm chứng từ bán hàng nguồn (SalesVoucher.receiptId,
  // tham chiếu lỏng không FK) để FE "Xem" mở thẳng chứng từ bán hàng.
  private async lookupSalesVouchers(vouchers: CashVoucher[]): Promise<Map<string, string>> {
    const receiptIds = vouchers
      .filter((v) => v.category === CashVoucherCategory.SALES_CASH)
      .map((v) => v.id)
    if (receiptIds.length === 0) return new Map()
    const sales = await this.prisma.salesVoucher.findMany({
      where: { receiptId: { in: receiptIds } },
      select: { id: true, receiptId: true },
    })
    return new Map(sales.filter((s) => s.receiptId).map((s) => [s.receiptId!, s.id]))
  }

  // PC PURCHASE_*_CASH tự sinh → tìm chứng từ mua hàng nguồn (PurchaseVoucher.paymentId,
  // tham chiếu lỏng không FK) để FE "Xem" mở thẳng chứng từ mua hàng/mua dịch vụ.
  private async lookupPurchaseVouchers(
    vouchers: CashVoucher[],
  ): Promise<Map<string, { id: string; type: PurchaseVoucherType }>> {
    const paymentIds = vouchers
      .filter(
        (v) =>
          v.category === CashVoucherCategory.PURCHASE_GOODS_CASH ||
          v.category === CashVoucherCategory.PURCHASE_SERVICE_CASH,
      )
      .map((v) => v.id)
    if (paymentIds.length === 0) return new Map()
    const purchases = await this.prisma.purchaseVoucher.findMany({
      where: { paymentId: { in: paymentIds } },
      select: { id: true, paymentId: true, type: true },
    })
    return new Map(
      purchases
        .filter((p) => p.paymentId)
        .map((p) => [p.paymentId!, { id: p.id, type: p.type }]),
    )
  }

  // Xem trước số phiếu kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  async previewNextVoucherNo(type: CashVoucherType, voucherDate?: string) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const voucherNo = await nextVoucherNo(this.prisma, type, date)
    return { voucherNo }
  }

  async create(dto: CreateCashVoucherDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, dto.type, new Date(dto.voucherDate))
      const lines = normalizeLines(dto.type, dto.lines)
      return tx.cashVoucher.create({
        data: {
          type: dto.type,
          category: dto.category,
          voucherNo,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          partnerType: dto.partnerType ?? null,
          partnerId: dto.partnerId ?? null,
          partnerName: dto.partnerName ?? null,
          payerReceiver: dto.payerReceiver ?? null,
          address: dto.address ?? null,
          employeeId: dto.employeeId ?? null,
          reason: dto.reason ?? null,
          attachmentCount: dto.attachmentCount ?? 0,
          branchId: dto.branchId ?? null,
          totalAmount: sumAmount(lines),
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(created)
  }

  async update(id: string, dto: UpdateCashVoucherDto) {
    const existing = await this.prisma.cashVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.CashVoucherUpdateInput = {
        category: dto.category ?? undefined,
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        partnerType: dto.partnerType ?? undefined,
        partnerId: dto.partnerId ?? undefined,
        partnerName: dto.partnerName ?? undefined,
        payerReceiver: dto.payerReceiver ?? undefined,
        address: dto.address ?? undefined,
        employeeId: dto.employeeId ?? undefined,
        reason: dto.reason ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        branchId: dto.branchId ?? undefined,
      }

      if (dto.lines) {
        const lines = normalizeLines(existing.type, dto.lines)
        data.totalAmount = sumAmount(lines)
        await tx.cashVoucherLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      }

      return tx.cashVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(updated)
  }

  // Nhập khẩu từ file Excel — dùng số chứng từ có sẵn, bỏ qua phiếu trùng số.
  async importXlsx(buffer: Buffer) {
    const parsed = parseCashXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.cashVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()
    const lookup = await buildPartnerLookup(this.prisma)

    const vouchers: Prisma.CashVoucherCreateManyInput[] = []
    const lines: Prisma.CashVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file
      const id = randomUUID()
      const isReceipt = p.type === CashVoucherType.RECEIPT
      // Loại nghiệp vụ liên quan nhân viên → ưu tiên tra trong danh mục nhân viên.
      const emp = EMPLOYEE_CATEGORIES.has(p.category) ? lookup.employee(p.partnerName) : null
      const resolved = emp
        ? { type: PartnerType.EMPLOYEE, ...emp }
        : lookup.any(p.partnerName)
      vouchers.push({
        id,
        type: p.type,
        category: p.category,
        voucherNo: p.voucherNo,
        postingDate: p.date,
        voucherDate: p.date,
        partnerType: resolved?.type ?? null,
        partnerId: resolved?.id ?? null,
        partnerName: p.partnerName,
        employeeId: resolved?.type === PartnerType.EMPLOYEE ? resolved.id : null,
        reason: p.reason,
        totalAmount: new Prisma.Decimal(p.amount),
        branchId: p.branchId,
      })
      // TK đối ứng ngầm định theo loại nghiệp vụ (§5) — loại không có map để trống.
      const counter = isReceipt
        ? (CASH_RECEIPT_CREDIT_ACCOUNT[p.category] ?? '')
        : (CASH_PAYMENT_DEBIT_ACCOUNT[p.category] ?? '')
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        description: p.description,
        debitAccount: isReceipt ? CHART_OF_ACCOUNTS.CASH_ON_HAND : counter,
        creditAccount: isReceipt ? counter : CHART_OF_ACCOUNTS.CASH_ON_HAND,
        amount: new Prisma.Decimal(p.amount),
        partnerId: resolved?.id ?? null,
        partnerName: p.partnerName,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.cashVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.cashVoucherLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }

  // Ghi sổ / bỏ ghi: chỉ đổi cờ posted (không đụng dòng hạch toán). Bỏ ghi =
  // đưa về nháp → loại khỏi sổ quỹ + báo cáo. Kỳ đã khóa sổ thì không cho đổi.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.cashVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.cashVoucher.update({
      where: { id },
      data: { posted },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return toVoucherDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.cashVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.cashVoucher.delete({ where: { id } })
    return { id }
  }

  // ── PT tự sinh từ chứng từ bán hàng thu tiền ngay - tiền mặt (SALES_CASH) ──
  // Public API cho SalesModule (§11): chạy trong transaction của phía gọi để
  // chứng từ bán hàng + phiếu thu ghi atomic. Nợ luôn 1111, Có theo dòng đầu vào.

  // Số PT kế tiếp — public để SalesModule đánh số chứng từ bán hàng thu ngay TM
  // trùng với phiếu thu tự sinh (MISA dùng chung 1 số PT####/YYYY).
  async nextReceiptNo(tx: Prisma.TransactionClient, voucherDate: Date) {
    return nextVoucherNo(tx, CashVoucherType.RECEIPT, voucherDate)
  }

  async createSalesReceipt(
    tx: Prisma.TransactionClient,
    input: SalesReceiptInput,
    presetVoucherNo?: string,
  ) {
    const voucherNo =
      presetVoucherNo ?? (await nextVoucherNo(tx, CashVoucherType.RECEIPT, input.voucherDate))
    const created = await tx.cashVoucher.create({
      data: {
        type: CashVoucherType.RECEIPT,
        category: CashVoucherCategory.SALES_CASH,
        voucherNo,
        ...salesReceiptData(input),
        lines: { create: salesReceiptLines(input) },
      },
      select: { id: true },
    })
    return created.id
  }

  // Đồng bộ PT theo chứng từ bán hàng khi sửa; PT đã bị xóa tay → tạo lại (id mới).
  async upsertSalesReceipt(
    tx: Prisma.TransactionClient,
    receiptId: string | null,
    input: SalesReceiptInput,
  ) {
    if (receiptId) {
      const existing = await tx.cashVoucher.findUnique({
        where: { id: receiptId },
        select: { id: true },
      })
      if (existing) {
        await tx.cashVoucherLine.deleteMany({ where: { voucherId: receiptId } })
        await tx.cashVoucher.update({
          where: { id: receiptId },
          data: { ...salesReceiptData(input), lines: { create: salesReceiptLines(input) } },
        })
        return receiptId
      }
    }
    return this.createSalesReceipt(tx, input)
  }

  // deleteMany/updateMany + điều kiện category: không nổ nếu PT đã bị xóa tay,
  // và không cho chứng từ bán hàng đụng nhầm phiếu nhập tay.
  async deleteSalesReceipt(tx: Prisma.TransactionClient, receiptId: string) {
    await tx.cashVoucher.deleteMany({
      where: { id: receiptId, category: CashVoucherCategory.SALES_CASH },
    })
  }

  async setSalesReceiptPosted(tx: Prisma.TransactionClient, receiptId: string, posted: boolean) {
    await tx.cashVoucher.updateMany({
      where: { id: receiptId, category: CashVoucherCategory.SALES_CASH },
      data: { posted },
    })
  }

  // ── PC tự sinh từ chứng từ mua hàng thanh toán ngay - tiền mặt ─────────────
  // (PURCHASE_SERVICE_CASH / PURCHASE_GOODS_CASH) — mirror nhóm PT bán hàng ở
  // trên: chạy trong transaction phía gọi, Có luôn 1111, Nợ theo dòng đầu vào.

  // Số PC kế tiếp — public để PurchaseModule đánh số chứng từ mua thanh toán
  // ngay TM (MH/MDV) trùng với phiếu chi tự sinh (MISA dùng chung 1 số PC ####/YYYY).
  async nextPaymentNo(tx: Prisma.TransactionClient, voucherDate: Date) {
    return nextVoucherNo(tx, CashVoucherType.PAYMENT, voucherDate)
  }

  async createPurchasePayment(
    tx: Prisma.TransactionClient,
    input: PurchasePaymentInput,
    presetVoucherNo?: string,
  ) {
    const voucherNo =
      presetVoucherNo ?? (await nextVoucherNo(tx, CashVoucherType.PAYMENT, input.voucherDate))
    const created = await tx.cashVoucher.create({
      data: {
        type: CashVoucherType.PAYMENT,
        category: input.category,
        voucherNo,
        ...purchasePaymentData(input),
        lines: { create: purchasePaymentLines(input) },
      },
      select: { id: true },
    })
    return created.id
  }

  // Đồng bộ PC theo chứng từ mua hàng khi sửa; PC đã bị xóa tay → tạo lại (id mới).
  async upsertPurchasePayment(
    tx: Prisma.TransactionClient,
    paymentId: string | null,
    input: PurchasePaymentInput,
  ) {
    if (paymentId) {
      const existing = await tx.cashVoucher.findUnique({
        where: { id: paymentId },
        select: { id: true },
      })
      if (existing) {
        await tx.cashVoucherLine.deleteMany({ where: { voucherId: paymentId } })
        await tx.cashVoucher.update({
          where: { id: paymentId },
          data: {
            category: input.category,
            ...purchasePaymentData(input),
            lines: { create: purchasePaymentLines(input) },
          },
        })
        return paymentId
      }
    }
    return this.createPurchasePayment(tx, input)
  }

  // deleteMany/updateMany + điều kiện category: không nổ nếu PC đã bị xóa tay,
  // và không cho chứng từ mua hàng đụng nhầm phiếu chi nhập tay.
  async deletePurchasePayment(tx: Prisma.TransactionClient, paymentId: string) {
    await tx.cashVoucher.deleteMany({
      where: { id: paymentId, category: { in: PURCHASE_CASH_CATEGORIES } },
    })
  }

  async setPurchasePaymentPosted(tx: Prisma.TransactionClient, paymentId: string, posted: boolean) {
    await tx.cashVoucher.updateMany({
      where: { id: paymentId, category: { in: PURCHASE_CASH_CATEGORIES } },
      data: { posted },
    })
  }

  async findVoucherNo(id: string) {
    const v = await this.prisma.cashVoucher.findUnique({
      where: { id },
      select: { voucherNo: true },
    })
    return v?.voucherNo ?? null
  }

  // ── PT thu tiền khách hàng theo hóa đơn (đối trừ công nợ) ───────────────────
  // Public API cho SalesModule (đối trừ công nợ): sinh phiếu thu Nợ 1111 /
  // Có 131 trong transaction của phía gọi. Dòng Có lấy từ input (TK công nợ
  // của từng chứng từ bán được đối trừ). Loại nghiệp vụ dùng RECEIPT (Thu khác).
  async createCustomerReceipt(tx: Prisma.TransactionClient, input: SalesReceiptInput) {
    const voucherNo = await nextVoucherNo(tx, CashVoucherType.RECEIPT, input.voucherDate)
    const created = await tx.cashVoucher.create({
      data: {
        type: CashVoucherType.RECEIPT,
        category: CashVoucherCategory.RECEIPT,
        voucherNo,
        ...salesReceiptData(input),
        lines: { create: salesReceiptLines(input) },
      },
      select: { id: true, voucherNo: true },
    })
    return created
  }
}

// Dữ liệu PT tự sinh — mirror từ chứng từ bán hàng thu tiền ngay.
export type SalesReceiptInput = {
  postingDate: Date
  voucherDate: Date
  customerId: string | null
  customerName: string | null
  address: string | null
  reason: string
  branchId: string | null
  posted: boolean
  // Dòng hạch toán phía Có (doanh thu theo dòng hàng + thuế GTGT); Nợ luôn 1111.
  lines: { description: string | null; creditAccount: string; amount: Prisma.Decimal }[]
}

function salesReceiptData(input: SalesReceiptInput) {
  return {
    postingDate: input.postingDate,
    voucherDate: input.voucherDate,
    partnerType: PartnerType.CUSTOMER,
    partnerId: input.customerId,
    partnerName: input.customerName,
    payerReceiver: input.customerName,
    address: input.address,
    reason: input.reason,
    branchId: input.branchId,
    posted: input.posted,
    totalAmount: sumAmount(input.lines),
  }
}

function salesReceiptLines(input: SalesReceiptInput) {
  return input.lines.map((l, i) => ({
    lineNo: i + 1,
    description: l.description,
    debitAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND,
    creditAccount: l.creditAccount,
    amount: l.amount,
    partnerId: input.customerId,
    partnerName: input.customerName,
  }))
}

// Loại PC tự sinh từ mua hàng — điều kiện update/delete để không đụng phiếu nhập tay.
const PURCHASE_CASH_CATEGORIES = [
  CashVoucherCategory.PURCHASE_SERVICE_CASH,
  CashVoucherCategory.PURCHASE_GOODS_CASH,
]

// Dữ liệu PC tự sinh — mirror từ chứng từ mua hàng thanh toán ngay tiền mặt.
export type PurchasePaymentInput = {
  category: CashVoucherCategory // PURCHASE_SERVICE_CASH | PURCHASE_GOODS_CASH
  postingDate: Date
  voucherDate: Date
  supplierId: string | null
  supplierName: string | null
  address: string | null
  reason: string
  branchId: string | null
  posted: boolean
  // Dòng hạch toán phía Nợ (TK kho/chi phí theo dòng hàng + thuế GTGT); Có luôn 1111.
  lines: { description: string | null; debitAccount: string; amount: Prisma.Decimal }[]
}

function purchasePaymentData(input: PurchasePaymentInput) {
  return {
    postingDate: input.postingDate,
    voucherDate: input.voucherDate,
    partnerType: PartnerType.SUPPLIER,
    partnerId: input.supplierId,
    partnerName: input.supplierName,
    payerReceiver: input.supplierName,
    address: input.address,
    reason: input.reason,
    branchId: input.branchId,
    posted: input.posted,
    totalAmount: sumAmount(input.lines),
  }
}

function purchasePaymentLines(input: PurchasePaymentInput) {
  return input.lines.map((l, i) => ({
    lineNo: i + 1,
    description: l.description,
    debitAccount: l.debitAccount,
    creditAccount: CHART_OF_ACCOUNTS.CASH_ON_HAND,
    amount: l.amount,
    partnerId: input.supplierId,
    partnerName: input.supplierName,
  }))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Định khoản mặc định: Thu → TK Nợ 1111; Chi → TK Có 1111 (§8.3).
function normalizeLines(type: CashVoucherType, lines: CreateCashVoucherLineDto[]) {
  return lines.map((line, i) => {
    const debitAccount =
      type === CashVoucherType.RECEIPT
        ? line.debitAccount || CHART_OF_ACCOUNTS.CASH_ON_HAND
        : line.debitAccount
    const creditAccount =
      type === CashVoucherType.PAYMENT
        ? line.creditAccount || CHART_OF_ACCOUNTS.CASH_ON_HAND
        : line.creditAccount
    // Vế còn lại (TK đối ứng) người dùng phải chọn — thiếu là bút toán lệch sổ.
    if (!debitAccount?.trim() || !creditAccount?.trim())
      throw new BadRequestException(`Dòng ${i + 1}: thiếu TK Nợ/Có`)
    return {
      lineNo: i + 1,
      description: line.description ?? null,
      debitAccount,
      creditAccount,
      amount: new Prisma.Decimal(line.amount),
      operation: line.operation ?? null,
      partnerId: line.partnerId ?? null,
      partnerName: line.partnerName ?? null,
      costItemId: line.costItemId ?? null,
      bankAccountNo: line.bankAccountNo ?? null,
      bankName: line.bankName ?? null,
      isVatLine: line.isVatLine ?? false,
      hasInvoice: line.hasInvoice ?? null,
      vatRate: line.vatRate != null ? new Prisma.Decimal(line.vatRate) : null,
      invoiceDate: line.invoiceDate ? new Date(line.invoiceDate) : null,
      invoiceNo: line.invoiceNo ?? null,
      goodsServiceGroup: line.goodsServiceGroup ?? null,
      supplierTaxCode: line.supplierTaxCode ?? null,
    }
  })
}

function sumAmount(lines: { amount: Prisma.Decimal }[]) {
  return lines.reduce((sum, l) => sum.add(l.amount), new Prisma.Decimal(0))
}

// Số chứng từ auto tăng theo prefix + năm (§8.1):
//   PT liền:      PT####/YYYY
//   PC có dấu cách: PC ####/YYYY
async function nextVoucherNo(
  tx: Prisma.TransactionClient,
  type: CashVoucherType,
  voucherDate: Date,
): Promise<string> {
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  // Số kế tiếp = MAX(số hiện có trong năm) + 1 — không dùng count vì số phiếu
  // (nhất là dữ liệu nhập khẩu) có thể không liên tục → count+1 gây trùng.
  const rows = await tx.cashVoucher.findMany({
    where: { type, voucherDate: { gte: yearStart, lt: yearEnd } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    // Lấy phần số trước dấu "/": "PT4510/2026" → 4510, "PC 0119/2026" → 119.
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  const seq = String(maxSeq + 1).padStart(4, '0')
  const prefix = type === CashVoucherType.RECEIPT ? 'PT' : 'PC '
  return `${prefix}${seq}/${year}`
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toVoucherDto(v: VoucherWithLines) {
  return {
    id: v.id,
    type: v.type,
    category: v.category,
    voucherNo: v.voucherNo,
    postingDate: toDateOnly(v.postingDate),
    voucherDate: toDateOnly(v.voucherDate),
    partnerType: v.partnerType,
    partnerId: v.partnerId,
    partnerName: v.partnerName,
    payerReceiver: v.payerReceiver,
    address: v.address,
    employeeId: v.employeeId,
    reason: v.reason,
    attachmentCount: v.attachmentCount,
    totalAmount: v.totalAmount.toString(),
    branchId: v.branchId,
    posted: v.posted,
    // Chứng từ nguồn (PT SALES_CASH / PC PURCHASE_*_CASH) — list/findOne enrich đè giá trị thật.
    salesVoucherId: null as string | null,
    purchaseVoucherId: null as string | null,
    purchaseVoucherType: null as PurchaseVoucherType | null,
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      description: l.description,
      debitAccount: l.debitAccount,
      creditAccount: l.creditAccount,
      amount: l.amount.toString(),
      operation: l.operation,
      partnerId: l.partnerId,
      partnerName: l.partnerName,
      costItemId: l.costItemId,
      bankAccountNo: l.bankAccountNo,
      bankName: l.bankName,
      isVatLine: l.isVatLine,
      hasInvoice: l.hasInvoice,
      vatRate: l.vatRate?.toString() ?? null,
      invoiceDate: l.invoiceDate ? toDateOnly(l.invoiceDate) : null,
      invoiceNo: l.invoiceNo,
      goodsServiceGroup: l.goodsServiceGroup,
      supplierTaxCode: l.supplierTaxCode,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
