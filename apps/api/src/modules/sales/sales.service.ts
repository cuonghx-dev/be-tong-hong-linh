import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import {
  PaymentMethod,
  Prisma,
  SalesPaymentMode,
  SalesVoucherType,
  type SalesVoucher,
  type SalesVoucherLine,
} from '@prisma/client'
import { randomUUID } from 'crypto'
import { PrismaService } from '../../database/prisma.service'
import { CreateSalesVoucherDto, CreateSalesVoucherLineDto } from './dto/create-sales-voucher.dto'
import { SalesVoucherFilterDto } from './dto/sales-voucher-filter.dto'
import { parseSalesXlsx } from './sales-import'
import { UpdateSalesVoucherDto } from './dto/update-sales-voucher.dto'

type VoucherWithRelations = SalesVoucher & {
  lines: SalesVoucherLine[]
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: SalesVoucherFilterDto): Promise<Paginated<ReturnType<typeof toVoucherDto>>> {
    const where: Prisma.SalesVoucherWhereInput = {}
    if (filter.voucherType) where.voucherType = filter.voucherType
    if (filter.paymentMode) where.paymentMode = filter.paymentMode
    if (filter.customerId) where.customerId = filter.customerId
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { customerName: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.salesVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.salesVoucher.count({ where }),
    ])

    return {
      data: rows.map(toVoucherDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.salesVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    return toVoucherDto(voucher)
  }

  async create(dto: CreateSalesVoucherDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, new Date(dto.voucherDate))
      const lines = normalizeLines(dto, dto.lines)
      const totals = sumTotals(lines)

      const voucher = await tx.salesVoucher.create({
        data: {
          voucherNo,
          voucherType: dto.voucherType,
          paymentMode: dto.paymentMode,
          paymentMethod: dto.paymentMethod ?? null,
          isInventoryIssue: dto.isInventoryIssue ?? false,
          withInvoice: dto.withInvoice ?? false,
          isPosInvoice: dto.isPosInvoice ?? false,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          customerId: dto.customerId ?? null,
          customerName: dto.customerName ?? null,
          taxCode: dto.taxCode ?? null,
          contactPerson: dto.contactPerson ?? null,
          address: dto.address ?? null,
          salesEmployeeId: dto.salesEmployeeId ?? null,
          description: dto.description ?? 'Bán hàng',
          attachmentCount: dto.attachmentCount ?? 0,
          paymentTermId: dto.paymentTermId ?? null,
          creditDays: dto.creditDays ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          einvoiceLookupCode: dto.einvoiceLookupCode ?? null,
          einvoiceLookupUrl: dto.einvoiceLookupUrl ?? null,
          branchId: dto.branchId ?? null,
          ...totals,
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })

      return voucher
    })
    return toVoucherDto(created)
  }

  async update(id: string, dto: UpdateSalesVoucherDto) {
    const existing = await this.prisma.salesVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.SalesVoucherUpdateInput = {
        paymentMode: dto.paymentMode ?? undefined,
        paymentMethod: dto.paymentMethod ?? undefined,
        isInventoryIssue: dto.isInventoryIssue ?? undefined,
        withInvoice: dto.withInvoice ?? undefined,
        isPosInvoice: dto.isPosInvoice ?? undefined,
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        customerName: dto.customerName ?? undefined,
        taxCode: dto.taxCode ?? undefined,
        contactPerson: dto.contactPerson ?? undefined,
        address: dto.address ?? undefined,
        salesEmployeeId: dto.salesEmployeeId ?? undefined,
        description: dto.description ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        paymentTermId: dto.paymentTermId ?? undefined,
        creditDays: dto.creditDays ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        einvoiceLookupCode: dto.einvoiceLookupCode ?? undefined,
        einvoiceLookupUrl: dto.einvoiceLookupUrl ?? undefined,
        branchId: dto.branchId ?? undefined,
      }
      if (dto.customerId !== undefined) {
        data.customer = dto.customerId
          ? { connect: { id: dto.customerId } }
          : { disconnect: true }
      }

      let totals: ReturnType<typeof sumTotals> | null = null
      if (dto.lines) {
        const lines = normalizeLines(
          { voucherType: existing.voucherType, paymentMode: dto.paymentMode ?? existing.paymentMode, paymentMethod: dto.paymentMethod ?? existing.paymentMethod ?? undefined },
          dto.lines,
        )
        totals = sumTotals(lines)
        Object.assign(data, totals)
        await tx.salesVoucherLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      }

      const voucher = await tx.salesVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })

      return voucher
    })
    return toVoucherDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.salesVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.prisma.salesVoucher.delete({ where: { id } })
    return { id }
  }

  // Nhập khẩu chứng từ bán hàng từ Excel (mức tổng hợp, 1 dòng hàng/chứng từ).
  // File không tách tiền hàng/thuế → coi toàn bộ tổng TT là tiền hàng, VAT = 0.
  async importXlsx(buffer: Buffer) {
    const parsed = parseSalesXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.salesVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))

    const vouchers: Prisma.SalesVoucherCreateManyInput[] = []
    const lines: Prisma.SalesVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      seen.add(p.voucherNo) // chống trùng trong chính file

      const totalGoods = new Prisma.Decimal(p.totalPayment)
      const ctx: NormalizeCtx = { voucherType: p.type, paymentMode: p.paymentMode }
      const id = randomUUID()
      vouchers.push({
        id,
        voucherNo: p.voucherNo,
        voucherType: p.type,
        paymentMode: p.paymentMode,
        isInventoryIssue: p.isInventoryIssue,
        withInvoice: p.withInvoice,
        postingDate: p.date,
        voucherDate: p.date,
        customerName: p.customerName,
        description: 'Bán hàng',
        totalGoods,
        totalVat: new Prisma.Decimal(0),
        totalAmount: totalGoods,
        branchId: p.branchId,
      })
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        debtAccount: defaultDebtAccount(ctx),
        revenueAccount: defaultRevenueAccount(ctx),
        quantity: new Prisma.Decimal(1),
        unitPrice: totalGoods,
        amount: totalGoods,
        vatRate: new Prisma.Decimal(0),
        vatAmount: new Prisma.Decimal(0),
        vatAccount: CHART_OF_ACCOUNTS.VAT_OUTPUT_DETAIL,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.salesVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.salesVoucherLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type NormalizeCtx = {
  voucherType: SalesVoucherType
  paymentMode: SalesPaymentMode
  paymentMethod?: PaymentMethod | null
}

// TK Nợ theo tùy chọn thanh toán (§7, §11):
//   Chưa thu → 131 (phải thu); Thu ngay → 1111 (TM) / 1121 (CK).
function defaultDebtAccount(ctx: NormalizeCtx): string {
  if (ctx.paymentMode === SalesPaymentMode.PAID_NOW) {
    return ctx.paymentMethod === PaymentMethod.BANK_TRANSFER
      ? CHART_OF_ACCOUNTS.BANK_DEPOSIT
      : CHART_OF_ACCOUNTS.CASH_ON_HAND
  }
  return CHART_OF_ACCOUNTS.RECEIVABLE
}

// TK doanh thu theo loại nghiệp vụ: hàng hóa 5111 / dịch vụ 5112.
function defaultRevenueAccount(ctx: NormalizeCtx): string {
  return ctx.voucherType === SalesVoucherType.DOMESTIC_SERVICE
    ? CHART_OF_ACCOUNTS.REVENUE_SERVICE
    : CHART_OF_ACCOUNTS.REVENUE_GOODS
}

// Chuẩn hóa dòng hàng + tính thành tiền/thuế + gán TK mặc định (§11.4).
function normalizeLines(ctx: NormalizeCtx, lines: CreateSalesVoucherLineDto[]) {
  const debt = defaultDebtAccount(ctx)
  const revenue = defaultRevenueAccount(ctx)
  return lines.map((line, i) => {
    const quantity = new Prisma.Decimal(line.quantity)
    const unitPrice = new Prisma.Decimal(line.unitPrice)
    const tradeDiscount = new Prisma.Decimal(line.tradeDiscount ?? 0)
    const amount = quantity.mul(unitPrice).sub(tradeDiscount)
    const vatRate = new Prisma.Decimal(line.vatRate ?? 0)
    const vatAmount = amount.mul(vatRate).div(100).toDecimalPlaces(2)
    return {
      lineNo: i + 1,
      itemId: line.itemId ?? null,
      itemName: line.itemName ?? null,
      tradeDiscount,
      debtAccount: line.debtAccount || debt,
      revenueAccount: line.revenueAccount || revenue,
      unit: line.unit ?? null,
      quantity,
      unitPrice,
      amount,
      vatRate,
      vatAmount,
      vatAccount: line.vatAccount || CHART_OF_ACCOUNTS.VAT_OUTPUT_DETAIL,
      lotNo: line.lotNo ?? null,
    }
  })
}

function sumTotals(lines: { amount: Prisma.Decimal; vatAmount: Prisma.Decimal }[]) {
  const totalGoods = lines.reduce((s, l) => s.add(l.amount), new Prisma.Decimal(0))
  const totalVat = lines.reduce((s, l) => s.add(l.vatAmount), new Prisma.Decimal(0))
  return { totalGoods, totalVat, totalAmount: totalGoods.add(totalVat) }
}

// Số chứng từ auto tăng: BH####/YYYY (§11.5).
async function nextVoucherNo(tx: Prisma.TransactionClient, voucherDate: Date): Promise<string> {
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const count = await tx.salesVoucher.count({
    where: { voucherDate: { gte: yearStart, lt: yearEnd } },
  })
  return `BH${String(count + 1).padStart(4, '0')}/${year}`
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toVoucherDto(v: VoucherWithRelations) {
  return {
    id: v.id,
    voucherNo: v.voucherNo,
    voucherType: v.voucherType,
    paymentMode: v.paymentMode,
    paymentMethod: v.paymentMethod,
    isInventoryIssue: v.isInventoryIssue,
    withInvoice: v.withInvoice,
    isPosInvoice: v.isPosInvoice,
    postingDate: toDateOnly(v.postingDate),
    voucherDate: toDateOnly(v.voucherDate),
    customerId: v.customerId,
    customerName: v.customerName,
    taxCode: v.taxCode,
    contactPerson: v.contactPerson,
    address: v.address,
    salesEmployeeId: v.salesEmployeeId,
    description: v.description,
    attachmentCount: v.attachmentCount,
    paymentTermId: v.paymentTermId,
    creditDays: v.creditDays,
    dueDate: v.dueDate ? toDateOnly(v.dueDate) : null,
    totalGoods: v.totalGoods.toString(),
    totalVat: v.totalVat.toString(),
    totalAmount: v.totalAmount.toString(),
    einvoiceLookupCode: v.einvoiceLookupCode,
    einvoiceLookupUrl: v.einvoiceLookupUrl,
    receiptId: v.receiptId,
    branchId: v.branchId,
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      itemId: l.itemId,
      itemName: l.itemName,
      tradeDiscount: l.tradeDiscount.toString(),
      debtAccount: l.debtAccount,
      revenueAccount: l.revenueAccount,
      unit: l.unit,
      quantity: l.quantity.toString(),
      unitPrice: l.unitPrice.toString(),
      amount: l.amount.toString(),
      vatRate: l.vatRate.toString(),
      vatAmount: l.vatAmount.toString(),
      vatAccount: l.vatAccount,
      lotNo: l.lotNo,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
