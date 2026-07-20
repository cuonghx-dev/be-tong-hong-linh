import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  Prisma,
  PurchaseVoucherType,
  type PurchaseVoucher,
  type PurchaseVoucherLine,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { buildPartnerLookup } from '../../database/partner-lookup'
import { BookLockService } from '../book-lock/book-lock.service'
import { CreatePurchaseVoucherDto, CreatePurchaseVoucherLineDto } from './dto/create-purchase-voucher.dto'
import { PurchaseVoucherFilterDto } from './dto/purchase-voucher-filter.dto'
import { parsePurchaseXlsx } from './purchase-import'
import { UpdatePurchaseVoucherDto } from './dto/update-purchase-voucher.dto'

type VoucherWithLines = PurchaseVoucher & { lines: PurchaseVoucherLine[] }

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  async list(
    filter: PurchaseVoucherFilterDto,
  ): Promise<Paginated<ReturnType<typeof toVoucherDto>>> {
    const where: Prisma.PurchaseVoucherWhereInput = {}
    if (filter.type) where.type = filter.type
    if (filter.supplierId) where.supplierId = filter.supplierId
    if (filter.receiveStatus) where.receiveStatus = filter.receiveStatus
    if (filter.paymentStatus) where.paymentStatus = filter.paymentStatus
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { invoiceNo: { contains: filter.keyword, mode: 'insensitive' } },
        { supplierName: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchaseVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.purchaseVoucher.count({ where }),
    ])

    return {
      data: rows.map(toVoucherDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.purchaseVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    return toVoucherDto(voucher)
  }

  // Xem trước số chứng từ kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  async previewNextVoucherNo(type: PurchaseVoucherType, voucherDate?: string) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const voucherNo = await nextVoucherNo(this.prisma, type, date)
    return { voucherNo }
  }

  async create(dto: CreatePurchaseVoucherDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, dto.type, new Date(dto.voucherDate))
      const lines = normalizeLines(dto.type, dto.lines)
      const totals = computeTotals(lines, dto.purchaseCost ?? 0)
      return tx.purchaseVoucher.create({
        data: {
          type: dto.type,
          origin: dto.origin ?? 'DOMESTIC',
          paymentMode: dto.paymentMode,
          paymentMethod: dto.paymentMethod ?? null,
          receiveWithInvoice: dto.receiveWithInvoice ?? false,
          voucherNo,
          invoiceNo: dto.invoiceNo ?? null,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          supplierId: dto.supplierId ?? null,
          supplierName: dto.supplierName ?? null,
          deliverer: dto.deliverer ?? null,
          address: dto.address ?? null,
          employeeId: dto.employeeId ?? null,
          description: dto.description ?? 'Mua hàng',
          attachmentCount: dto.attachmentCount ?? 0,
          contractNo: dto.contractNo ?? null,
          paymentTermId: dto.paymentTermId ?? null,
          creditDays: dto.creditDays ?? null,
          dueDate: resolveDueDate(dto),
          purchaseCost: new Prisma.Decimal(dto.purchaseCost ?? 0),
          ...totals,
          receiveStatus: dto.receiveWithInvoice ? 'RECEIVED' : 'NOT_RECEIVED',
          paymentStatus: dto.paymentMode === 'IMMEDIATE' ? 'PAID' : 'UNPAID',
          branchId: dto.branchId ?? null,
          einvoiceLookupCode: dto.einvoiceLookupCode ?? null,
          einvoiceLookupUrl: dto.einvoiceLookupUrl ?? null,
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(created)
  }

  async update(id: string, dto: UpdatePurchaseVoucherDto) {
    const existing = await this.prisma.purchaseVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.PurchaseVoucherUpdateInput = {
        origin: dto.origin ?? undefined,
        paymentMode: dto.paymentMode ?? undefined,
        paymentMethod: dto.paymentMethod ?? undefined,
        receiveWithInvoice: dto.receiveWithInvoice ?? undefined,
        invoiceNo: dto.invoiceNo ?? undefined,
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        supplierId: dto.supplierId ?? undefined,
        supplierName: dto.supplierName ?? undefined,
        deliverer: dto.deliverer ?? undefined,
        address: dto.address ?? undefined,
        employeeId: dto.employeeId ?? undefined,
        description: dto.description ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        contractNo: dto.contractNo ?? undefined,
        paymentTermId: dto.paymentTermId ?? undefined,
        creditDays: dto.creditDays ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        einvoiceLookupCode: dto.einvoiceLookupCode ?? undefined,
        einvoiceLookupUrl: dto.einvoiceLookupUrl ?? undefined,
        branchId: dto.branchId ?? undefined,
      }
      if (dto.paymentMode) data.paymentStatus = dto.paymentMode === 'IMMEDIATE' ? 'PAID' : 'UNPAID'
      if (dto.receiveWithInvoice !== undefined) {
        data.receiveStatus = dto.receiveWithInvoice ? 'RECEIVED' : 'NOT_RECEIVED'
      }

      if (dto.lines) {
        const lines = normalizeLines(existing.type, dto.lines)
        const cost = dto.purchaseCost ?? Number(existing.purchaseCost)
        Object.assign(data, computeTotals(lines, cost))
        data.purchaseCost = new Prisma.Decimal(cost)
        await tx.purchaseVoucherLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      } else if (dto.purchaseCost !== undefined) {
        data.purchaseCost = new Prisma.Decimal(dto.purchaseCost)
        data.stockValue = new Prisma.Decimal(dto.purchaseCost).add(existing.totalGoods)
      }

      return tx.purchaseVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(updated)
  }

  // Nhập khẩu chứng từ mua hàng từ file Excel (mức tổng hợp). Bỏ qua số chứng từ trùng.
  async importXlsx(buffer: Buffer) {
    const parsed = parsePurchaseXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.purchaseVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()
    const lookup = await buildPartnerLookup(this.prisma)

    const vouchers: Prisma.PurchaseVoucherCreateManyInput[] = []
    const lines: Prisma.PurchaseVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file

      // Tách tiền hàng / thuế từ số tổng hợp Excel (§10.2, §10.4):
      //   nhập kho: giá trị nhập kho = tiền hàng + chi phí → tiền hàng = GT nhập kho − chi phí;
      //   thuế = tổng TT − tiền hàng. Loại khác không có GT nhập kho → coi toàn bộ là tiền hàng.
      const cost = new Prisma.Decimal(p.purchaseCost)
      const payment = new Prisma.Decimal(p.totalPayment)
      const stock = new Prisma.Decimal(p.stockValue)
      const totalGoods =
        p.type === PurchaseVoucherType.STOCK && p.stockValue > 0 ? stock.sub(cost) : payment
      const totalVat = payment.sub(totalGoods)
      const vatRate = totalGoods.gt(0)
        ? new Prisma.Decimal(totalVat.div(totalGoods).mul(100).toDecimalPlaces(0))
        : new Prisma.Decimal(0)

      const id = randomUUID()
      vouchers.push({
        id,
        type: p.type,
        paymentMode: p.paymentStatus === 'PAID' ? 'IMMEDIATE' : 'UNPAID',
        receiveWithInvoice: p.receiveStatus === 'RECEIVED',
        voucherNo: p.voucherNo,
        invoiceNo: p.invoiceNo,
        postingDate: p.date,
        voucherDate: p.date,
        supplierId: lookup.supplier(p.supplierName)?.id ?? null,
        supplierName: p.supplierName,
        description: 'Mua hàng',
        totalGoods,
        totalVat,
        totalPayment: payment,
        purchaseCost: cost,
        stockValue: p.type === PurchaseVoucherType.STOCK ? stock : totalGoods,
        receiveStatus: p.receiveStatus,
        paymentStatus: p.paymentStatus,
        branchId: p.branchId,
      })
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        stockAccount: defaultStockAccount(p.type),
        payableAccount: CHART_OF_ACCOUNTS.PAYABLE,
        quantity: new Prisma.Decimal(1),
        unitPrice: totalGoods,
        amount: totalGoods,
        vatRate,
        vatAmount: totalVat,
        vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.purchaseVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.purchaseVoucherLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }

  // Ghi sổ / bỏ ghi: chỉ đổi cờ posted (không đụng dòng hàng tiền). Bỏ ghi =
  // đưa về nháp → loại khỏi sổ mua hàng + báo cáo. Kỳ đã khóa sổ thì không cho đổi.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.purchaseVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.purchaseVoucher.update({
      where: { id },
      data: { posted },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return toVoucherDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.purchaseVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.purchaseVoucher.delete({ where: { id } })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Định khoản mặc định theo loại chứng từ (§5):
//   nhập kho → TK Kho 152/156; không qua kho / dịch vụ → chi phí 642.
function defaultStockAccount(type: PurchaseVoucherType): string {
  return type === PurchaseVoucherType.STOCK ? CHART_OF_ACCOUNTS.GOODS : CHART_OF_ACCOUNTS.SERVICE_EXPENSE
}

function normalizeLines(type: PurchaseVoucherType, lines: CreatePurchaseVoucherLineDto[]) {
  return lines.map((line, i) => {
    const quantity = new Prisma.Decimal(line.quantity)
    const unitPrice = new Prisma.Decimal(line.unitPrice)
    const amount = quantity.mul(unitPrice)
    const vatRate = new Prisma.Decimal(line.vatRate ?? 0)
    const vatAmount = amount.mul(vatRate).div(100)
    return {
      lineNo: i + 1,
      itemId: line.itemId ?? null,
      itemName: line.itemName ?? null,
      warehouseId: type === PurchaseVoucherType.STOCK ? line.warehouseId ?? null : null,
      stockAccount: line.stockAccount || defaultStockAccount(type),
      payableAccount: line.payableAccount || CHART_OF_ACCOUNTS.PAYABLE,
      unit: line.unit ?? null,
      quantity,
      unitPrice,
      amount,
      vatRate,
      vatAmount,
      vatAccount: line.vatAccount || CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
    }
  })
}

// §10.2: Tổng tiền hàng = Σ thành tiền; Thuế = Σ tiền thuế;
// Tổng TT = hàng + thuế; Giá trị nhập kho = tiền hàng + chi phí mua hàng phân bổ (§10.4).
function computeTotals(
  lines: { amount: Prisma.Decimal; vatAmount: Prisma.Decimal }[],
  purchaseCost: number,
) {
  const totalGoods = lines.reduce((s, l) => s.add(l.amount), new Prisma.Decimal(0))
  const totalVat = lines.reduce((s, l) => s.add(l.vatAmount), new Prisma.Decimal(0))
  const cost = new Prisma.Decimal(purchaseCost)
  return {
    totalGoods,
    totalVat,
    totalPayment: totalGoods.add(totalVat),
    stockValue: totalGoods.add(cost),
  }
}

// §10.5: Hạn TT = ngày chứng từ + số ngày được nợ (nếu chưa có dueDate rõ ràng).
function resolveDueDate(dto: CreatePurchaseVoucherDto): Date | null {
  if (dto.dueDate) return new Date(dto.dueDate)
  if (dto.creditDays && dto.creditDays > 0) {
    const d = new Date(dto.voucherDate)
    d.setDate(d.getDate() + dto.creditDays)
    return d
  }
  return null
}

// Số chứng từ auto tăng theo prefix loại NV (§10.1):
//   nhập kho:      NK####      (không kèm năm)
//   không qua kho: MH####/YYYY
//   dịch vụ:       MDV####/YYYY
async function nextVoucherNo(
  tx: Prisma.TransactionClient,
  type: PurchaseVoucherType,
  voucherDate: Date,
): Promise<string> {
  // Nhập kho: dãy số chạy toàn cục, không kèm năm (vd NK07098) → không reset theo năm.
  if (type === PurchaseVoucherType.STOCK) {
    const count = await tx.purchaseVoucher.count({ where: { type } })
    return `NK${String(count + 1).padStart(5, '0')}`
  }
  // MH / MDV: số reset theo năm, kèm hậu tố /YYYY.
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const count = await tx.purchaseVoucher.count({
    where: { type, voucherDate: { gte: yearStart, lt: yearEnd } },
  })
  const seq = String(count + 1).padStart(4, '0')
  const prefix = type === PurchaseVoucherType.SERVICE ? 'MDV' : 'MH'
  return `${prefix}${seq}/${year}`
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function toVoucherDto(v: VoucherWithLines) {
  return {
    id: v.id,
    type: v.type,
    origin: v.origin,
    paymentMode: v.paymentMode,
    paymentMethod: v.paymentMethod,
    receiveWithInvoice: v.receiveWithInvoice,
    voucherNo: v.voucherNo,
    invoiceNo: v.invoiceNo,
    postingDate: toDateOnly(v.postingDate)!,
    voucherDate: toDateOnly(v.voucherDate)!,
    supplierId: v.supplierId,
    supplierName: v.supplierName,
    deliverer: v.deliverer,
    address: v.address,
    employeeId: v.employeeId,
    description: v.description,
    attachmentCount: v.attachmentCount,
    contractNo: v.contractNo,
    paymentTermId: v.paymentTermId,
    creditDays: v.creditDays,
    dueDate: toDateOnly(v.dueDate),
    totalGoods: v.totalGoods.toString(),
    totalVat: v.totalVat.toString(),
    totalPayment: v.totalPayment.toString(),
    purchaseCost: v.purchaseCost.toString(),
    stockValue: v.stockValue.toString(),
    posted: v.posted,
    einvoiceLookupCode: v.einvoiceLookupCode,
    einvoiceLookupUrl: v.einvoiceLookupUrl,
    receiveStatus: v.receiveStatus,
    paymentStatus: v.paymentStatus,
    branchId: v.branchId,
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      itemId: l.itemId,
      itemName: l.itemName,
      warehouseId: l.warehouseId,
      stockAccount: l.stockAccount,
      payableAccount: l.payableAccount,
      unit: l.unit,
      quantity: l.quantity.toString(),
      unitPrice: l.unitPrice.toString(),
      amount: l.amount.toString(),
      vatRate: l.vatRate.toString(),
      vatAmount: l.vatAmount.toString(),
      vatAccount: l.vatAccount,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
