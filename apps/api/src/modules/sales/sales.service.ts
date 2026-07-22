import { CHART_OF_ACCOUNTS, SalesPaymentStatus, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import {
  Prisma,
  SalesPaymentMode,
  type SalesVoucher,
  type SalesVoucherLine,
} from '@prisma/client'
import { randomUUID } from 'crypto'
import { PrismaService } from '../../database/prisma.service'
import { buildPartnerLookup } from '../../database/partner-lookup'
import { BookLockService } from '../book-lock/book-lock.service'
import { CashService, type SalesReceiptInput } from '../cash/cash.service'
import { GoodsIssueService, type SalesIssueInput } from '../inventory/goods-issue.service'
import { CreateSalesVoucherDto, CreateSalesVoucherLineDto } from './dto/create-sales-voucher.dto'
import { SalesVoucherFilterDto } from './dto/sales-voucher-filter.dto'
import { parseSalesXlsx } from './sales-import'
import { UpdateSalesVoucherDto } from './dto/update-sales-voucher.dto'

type VoucherWithRelations = SalesVoucher & {
  lines: SalesVoucherLine[]
  // Đối trừ thu tiền sau, chỉ dòng có nguồn đã ghi sổ (xem VOUCHER_INCLUDE) —
  // vắng mặt (create/update trả về) = coi như chưa có đối trừ.
  allocations?: { amount: Prisma.Decimal }[]
}

// Include chung cho mọi query trả VoucherWithRelations: dòng hàng + đối trừ đã
// ghi sổ (nguồn tiền posted) để tính TT thanh toán.
const VOUCHER_INCLUDE = {
  lines: { orderBy: { lineNo: 'asc' } },
  allocations: {
    where: { OR: [{ cashVoucher: { posted: true } }, { bankVoucher: { posted: true } }] },
    select: { amount: true },
  },
} satisfies Prisma.SalesVoucherInclude

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
    private readonly cash: CashService,
    private readonly goodsIssue: GoodsIssueService,
  ) {}

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
        { invoiceNo: { contains: filter.keyword, mode: 'insensitive' } },
        { customerName: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.salesVoucher.findMany({
        where,
        include: VOUCHER_INCLUDE,
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
      include: VOUCHER_INCLUDE,
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    return this.toDetailDto(voucher)
  }

  // DTO chi tiết kèm số các chứng từ tự sinh (hiện link tham chiếu trên form).
  private async toDetailDto(v: VoucherWithRelations) {
    const [receiptNo, issueNo] = await Promise.all([
      v.receiptId ? this.cash.findVoucherNo(v.receiptId) : null,
      v.issueId ? this.goodsIssue.findVoucherNo(v.issueId) : null,
    ])
    return { ...toVoucherDto(v), receiptNo, issueNo }
  }

  // Dòng phiếu xuất từ dòng bán hàng: resolve sản phẩm (theo id/mã/tên) để lấy
  // kho ngầm định + TK kho + giá vốn tạm (= đơn giá mua gần nhất; chưa tính bình quân).
  private async buildIssueInput(
    tx: Prisma.TransactionClient,
    v: VoucherWithRelations,
  ): Promise<SalesIssueInput> {
    const ids = [...new Set(v.lines.map((l) => l.itemId).filter((x): x is string => !!x))]
    const names = [...new Set(v.lines.map((l) => l.itemName).filter((x): x is string => !!x))]
    const products = await tx.product.findMany({
      where: { OR: [{ id: { in: ids } }, { code: { in: ids } }, { name: { in: names } }] },
    })
    const byId = new Map(products.map((p) => [p.id, p]))
    const byCode = new Map(products.map((p) => [p.code, p]))
    const byName = new Map(products.map((p) => [p.name, p]))
    return {
      postingDate: v.postingDate,
      voucherDate: v.voucherDate,
      customerId: v.customerId,
      customerName: v.customerName,
      receiver: v.contactPerson ?? v.customerName,
      address: v.address,
      salesEmployeeId: v.salesEmployeeId,
      description: `Xuất kho bán hàng${v.customerName ? ` ${v.customerName}` : ''} theo chứng từ ${v.voucherNo}`,
      posted: v.posted,
      lines: v.lines.map((l) => {
        const p =
          (l.itemId ? (byId.get(l.itemId) ?? byCode.get(l.itemId)) : undefined) ??
          (l.itemName ? byName.get(l.itemName) : undefined)
        return {
          itemId: p?.id ?? l.itemId,
          itemName: l.itemName ?? p?.name ?? null,
          warehouseId: p?.defaultWarehouseCode ?? null,
          debitAccount: p?.costAccount ?? null,
          creditAccount: p?.inventoryAccount ?? null,
          unit: l.unit ?? p?.unit ?? null,
          quantity: l.quantity,
          unitPrice: p?.purchasePrice ?? new Prisma.Decimal(0),
          lotNo: l.lotNo,
        }
      }),
    }
  }

  // Xem trước số chứng từ kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  // Đánh số theo tùy chọn thanh toán như MISA: thu tiền mặt ngay → số PT (sequence quỹ),
  // chưa thu → BH.
  async previewNextVoucherNo(voucherDate?: string, paymentMode?: SalesPaymentMode) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const mode = paymentMode ?? SalesPaymentMode.UNPAID
    if (mode === SalesPaymentMode.PAID_NOW)
      return { voucherNo: await this.cash.nextReceiptNo(this.prisma, date) }
    return { voucherNo: await nextVoucherNo(this.prisma, date) }
  }

  async create(dto: CreateSalesVoucherDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    const created = await this.prisma.$transaction(async (tx) => {
      const vDate = new Date(dto.voucherDate)
      const wantsCash = dto.paymentMode === SalesPaymentMode.PAID_NOW
      // Số chứng từ theo tùy chọn thanh toán (MISA): thu tiền mặt ngay dùng chung
      // số với phiếu thu tự sinh; chưa thu → BH####/YYYY.
      const voucherNo = wantsCash
        ? await this.cash.nextReceiptNo(tx, vDate)
        : await nextVoucherNo(tx, vDate)
      const lines = normalizeLines(dto, dto.lines)
      const totals = sumTotals(lines)

      const voucher = await tx.salesVoucher.create({
        data: {
          voucherNo,
          invoiceNo: dto.invoiceNo ?? null,
          voucherType: dto.voucherType,
          paymentMode: dto.paymentMode,
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
        include: VOUCHER_INCLUDE,
      })

      // Chứng từ tự sinh kèm theo (§11): thu tiền mặt ngay → Phiếu thu (cùng số),
      // kiêm phiếu xuất → Phiếu xuất kho (số XK riêng).
      const links: Prisma.SalesVoucherUpdateInput = {}
      if (wantsCash)
        links.receiptId = await this.cash.createSalesReceipt(
          tx,
          buildCashReceiptInput(voucher),
          voucherNo,
        )
      if (voucher.isInventoryIssue)
        links.issueId = await this.goodsIssue.createSalesIssue(
          tx,
          await this.buildIssueInput(tx, voucher),
        )
      if (Object.keys(links).length > 0) {
        return tx.salesVoucher.update({
          where: { id: voucher.id },
          data: links,
          include: VOUCHER_INCLUDE,
        })
      }

      return voucher
    })
    return this.toDetailDto(created)
  }

  async update(id: string, dto: UpdateSalesVoucherDto) {
    const existing = await this.prisma.salesVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.SalesVoucherUpdateInput = {
        invoiceNo: dto.invoiceNo ?? undefined,
        paymentMode: dto.paymentMode ?? undefined,
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
          { paymentMode: dto.paymentMode ?? existing.paymentMode },
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
        include: VOUCHER_INCLUDE,
      })

      // Đồng bộ chứng từ tự sinh theo tùy chọn mới (§11). Số chứng từ bán hàng
      // giữ nguyên sau khi tạo; chứng từ sinh lại khi đổi tùy chọn nhận số mới.
      const links: Prisma.SalesVoucherUpdateInput = {}

      // Phiếu thu tiền mặt (SALES_CASH)
      if (voucher.paymentMode === SalesPaymentMode.PAID_NOW) {
        const receiptId = await this.cash.upsertSalesReceipt(
          tx,
          existing.receiptId,
          buildCashReceiptInput(voucher),
        )
        if (receiptId !== existing.receiptId) links.receiptId = receiptId
      } else if (existing.receiptId) {
        await this.cash.deleteSalesReceipt(tx, existing.receiptId)
        links.receiptId = null
      }

      // Phiếu xuất kho (kiêm phiếu xuất)
      if (voucher.isInventoryIssue) {
        const issueId = await this.goodsIssue.upsertSalesIssue(
          tx,
          existing.issueId,
          await this.buildIssueInput(tx, voucher),
        )
        if (issueId !== existing.issueId) links.issueId = issueId
      } else if (existing.issueId) {
        await this.goodsIssue.deleteSalesIssue(tx, existing.issueId)
        links.issueId = null
      }

      if (Object.keys(links).length > 0) {
        return tx.salesVoucher.update({
          where: { id },
          data: links,
          include: VOUCHER_INCLUDE,
        })
      }

      return voucher
    })
    return this.toDetailDto(updated)
  }

  // Ghi sổ / bỏ ghi: chỉ đổi cờ posted (không đụng dòng hàng tiền). Bỏ ghi =
  // đưa về nháp → loại khỏi sổ bán hàng + báo cáo + công nợ. Kỳ đã khóa sổ thì không cho đổi.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.salesVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.$transaction(async (tx) => {
      const voucher = await tx.salesVoucher.update({
        where: { id },
        data: { posted },
        include: VOUCHER_INCLUDE,
      })
      // Ghi sổ / bỏ ghi lan sang mọi chứng từ tự sinh — cùng trạng thái sổ.
      if (voucher.receiptId) await this.cash.setSalesReceiptPosted(tx, voucher.receiptId, posted)
      if (voucher.issueId) await this.goodsIssue.setSalesIssuePosted(tx, voucher.issueId, posted)
      return voucher
    })
    return this.toDetailDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.salesVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.$transaction(async (tx) => {
      await tx.salesVoucher.delete({ where: { id } })
      // Xóa kèm mọi chứng từ tự sinh — không để chứng từ mồ côi khi mất chứng từ gốc.
      if (existing.receiptId) await this.cash.deleteSalesReceipt(tx, existing.receiptId)
      if (existing.issueId) await this.goodsIssue.deleteSalesIssue(tx, existing.issueId)
    })
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
    const lockDate = await this.bookLock.getLockDate()
    const lookup = await buildPartnerLookup(this.prisma)

    const vouchers: Prisma.SalesVoucherCreateManyInput[] = []
    const lines: Prisma.SalesVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file

      const totalGoods = new Prisma.Decimal(p.totalPayment)
      const ctx: NormalizeCtx = { paymentMode: p.paymentMode }
      const id = randomUUID()
      vouchers.push({
        id,
        voucherNo: p.voucherNo,
        invoiceNo: p.invoiceNo,
        voucherType: p.type,
        paymentMode: p.paymentMode,
        isInventoryIssue: p.isInventoryIssue,
        withInvoice: p.withInvoice,
        postingDate: p.date,
        voucherDate: p.date,
        customerId: lookup.customer(p.customerName)?.id ?? null,
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
        revenueAccount: CHART_OF_ACCOUNTS.REVENUE_GOODS,
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

// Phiếu thu tự sinh (thu tiền mặt ngay) mirror chứng từ bán hàng: mỗi dòng hàng
// 1 dòng Có TK doanh thu, thuế GTGT gộp theo TK thuế (thường 33311); TK Nợ (1111)
// do CashService gán.
// LƯU Ý: định khoản gốc đã nằm trong dòng chứng từ bán hàng — sổ nhật ký loại
// category SALES_CASH để không đếm trùng (xem report.service).
function buildReceiptCore(v: VoucherWithRelations) {
  const lines = v.lines.map((l) => ({
    description: l.itemName,
    creditAccount: l.revenueAccount,
    amount: l.amount,
  }))
  const vatByAccount = new Map<string, Prisma.Decimal>()
  for (const l of v.lines) {
    if (l.vatAmount.isZero()) continue
    vatByAccount.set(
      l.vatAccount,
      (vatByAccount.get(l.vatAccount) ?? new Prisma.Decimal(0)).add(l.vatAmount),
    )
  }
  for (const [account, amount] of vatByAccount) {
    lines.push({ description: 'Thuế GTGT đầu ra', creditAccount: account, amount })
  }
  return {
    postingDate: v.postingDate,
    voucherDate: v.voucherDate,
    customerId: v.customerId,
    customerName: v.customerName,
    address: v.address,
    reason: `Thu tiền bán hàng${v.customerName ? ` ${v.customerName}` : ''} theo chứng từ ${v.voucherNo}`,
    branchId: v.branchId,
    posted: v.posted,
    lines,
  }
}

function buildCashReceiptInput(v: VoucherWithRelations): SalesReceiptInput {
  return buildReceiptCore(v)
}

type NormalizeCtx = {
  paymentMode: SalesPaymentMode
}

// TK Nợ theo tùy chọn thanh toán (§7, §11):
//   Chưa thu → 131 (phải thu); Thu tiền mặt ngay → 1111.
function defaultDebtAccount(ctx: NormalizeCtx): string {
  return ctx.paymentMode === SalesPaymentMode.PAID_NOW
    ? CHART_OF_ACCOUNTS.CASH_ON_HAND
    : CHART_OF_ACCOUNTS.RECEIVABLE
}

// Chuẩn hóa dòng hàng + tính thành tiền/thuế + gán TK mặc định (§11.4).
function normalizeLines(ctx: NormalizeCtx, lines: CreateSalesVoucherLineDto[]) {
  const debt = defaultDebtAccount(ctx)
  const revenue = CHART_OF_ACCOUNTS.REVENUE_GOODS
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

// Số chứng từ auto tăng: BH####/YYYY (§11.5) — chỉ cho chứng từ chưa thu tiền;
// thu tiền ngay lấy số PT/NTTK từ sequence quỹ/tiền gửi (xem create).
async function nextVoucherNo(tx: Prisma.TransactionClient, voucherDate: Date): Promise<string> {
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  // MAX+1 trên riêng số BH: bảng còn chứa chứng từ mang số PT/NTTK (thu tiền ngay)
  // và dữ liệu nhập khẩu có thể đứt quãng — count+1 gây trùng.
  const rows = await tx.salesVoucher.findMany({
    where: { voucherNo: { startsWith: 'BH' }, voucherDate: { gte: yearStart, lt: yearEnd } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    // Lấy phần số trước dấu "/": "BH2167/2026" → 2167.
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  return `BH${String(maxSeq + 1).padStart(4, '0')}/${year}`
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// TT thanh toán (cột MISA): thu ngay = đã thanh toán; chưa thu = so tổng đối trừ
// đã ghi sổ với tổng tiền chứng từ.
function paymentInfo(v: VoucherWithRelations): { paidAmount: Prisma.Decimal; paymentStatus: SalesPaymentStatus } {
  if (v.paymentMode === SalesPaymentMode.PAID_NOW) {
    return { paidAmount: v.totalAmount, paymentStatus: SalesPaymentStatus.Paid }
  }
  const paid = (v.allocations ?? []).reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0))
  const paymentStatus = paid.greaterThanOrEqualTo(v.totalAmount)
    ? SalesPaymentStatus.Paid
    : paid.greaterThan(0)
      ? SalesPaymentStatus.Partial
      : SalesPaymentStatus.Unpaid
  return { paidAmount: paid, paymentStatus }
}

function toVoucherDto(v: VoucherWithRelations) {
  const { paidAmount, paymentStatus } = paymentInfo(v)
  return {
    paidAmount: paidAmount.toString(),
    paymentStatus,
    id: v.id,
    voucherNo: v.voucherNo,
    invoiceNo: v.invoiceNo,
    voucherType: v.voucherType,
    paymentMode: v.paymentMode,
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
    issueId: v.issueId,
    posted: v.posted,
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
