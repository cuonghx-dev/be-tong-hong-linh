import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  GoodsIssueCategory,
  Prisma,
  type GoodsIssueLine,
  type GoodsIssueVoucher,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { BookLockService } from '../book-lock/book-lock.service'
import { CreateGoodsIssueDto, CreateGoodsIssueLineDto } from './dto/create-goods-issue.dto'
import { GoodsIssueFilterDto } from './dto/goods-issue-filter.dto'
import { UpdateGoodsIssueDto } from './dto/update-goods-issue.dto'
import { parseGoodsIssueXlsx } from './goods-issue-import'

type IssueWithLines = GoodsIssueVoucher & { lines: GoodsIssueLine[] }

@Injectable()
export class GoodsIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  async list(filter: GoodsIssueFilterDto): Promise<Paginated<ReturnType<typeof toIssueDto>>> {
    const where: Prisma.GoodsIssueVoucherWhereInput = {}
    if (filter.category) where.category = filter.category
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
        { receiver: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.goodsIssueVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.goodsIssueVoucher.count({ where }),
    ])

    return {
      data: rows.map(toIssueDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const issue = await this.prisma.goodsIssueVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!issue) throw new NotFoundException(`Không tìm thấy phiếu xuất kho ${id}`)
    return toIssueDto(issue)
  }

  // Xem trước số phiếu xuất kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  async previewNextVoucherNo(voucherDate?: string) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const voucherNo = await nextVoucherNo(this.prisma, date)
    return { voucherNo }
  }

  async create(dto: CreateGoodsIssueDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, new Date(dto.voucherDate))
      const lines = normalizeLines(dto.category, dto.lines)
      const totalAmount = computeTotal(lines)
      return tx.goodsIssueVoucher.create({
        data: {
          category: dto.category,
          voucherNo,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          customerId: dto.customerId ?? null,
          customerName: dto.customerName ?? null,
          receiver: dto.receiver ?? null,
          address: dto.address ?? null,
          salesEmployeeId: dto.salesEmployeeId ?? null,
          description: dto.description ?? 'Xuất kho',
          attachmentCount: dto.attachmentCount ?? 0,
          deliveryLocation: dto.deliveryLocation ?? null,
          totalAmount,
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toIssueDto(created)
  }

  async update(id: string, dto: UpdateGoodsIssueDto) {
    const existing = await this.prisma.goodsIssueVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu xuất kho ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.GoodsIssueVoucherUpdateInput = {
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        customerId: dto.customerId ?? undefined,
        customerName: dto.customerName ?? undefined,
        receiver: dto.receiver ?? undefined,
        address: dto.address ?? undefined,
        salesEmployeeId: dto.salesEmployeeId ?? undefined,
        description: dto.description ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        deliveryLocation: dto.deliveryLocation ?? undefined,
      }

      if (dto.lines) {
        // Ghi lại dòng: xóa hết dòng cũ rồi tạo lại + tính lại tổng tiền.
        const lines = normalizeLines(existing.category, dto.lines)
        data.totalAmount = computeTotal(lines)
        await tx.goodsIssueLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      }

      return tx.goodsIssueVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toIssueDto(updated)
  }

  // Nhập khẩu phiếu xuất kho từ file Excel (mức tổng hợp). Bỏ qua số chứng từ trùng.
  async importXlsx(buffer: Buffer) {
    const parsed = parseGoodsIssueXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.goodsIssueVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()

    const vouchers: Prisma.GoodsIssueVoucherCreateManyInput[] = []
    const lines: Prisma.GoodsIssueLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file

      const total = new Prisma.Decimal(p.totalAmount)
      const id = randomUUID()
      vouchers.push({
        id,
        category: p.category,
        voucherNo: p.voucherNo,
        postingDate: p.date,
        voucherDate: p.date,
        receiver: p.receiver,
        description: p.description ?? 'Xuất kho',
        totalAmount: total,
        salesDocStatus: p.salesDocStatus,
        invoiceIssueStatus: p.invoiceIssueStatus,
        taxAuthorityCode: p.taxAuthorityCode,
      })
      // Mức tổng hợp không có dòng hàng chi tiết → 1 dòng đại diện theo định khoản mặc định.
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        debitAccount: defaultDebitAccount(p.category),
        creditAccount: defaultCreditAccount(p.category),
        quantity: new Prisma.Decimal(1),
        unitPrice: total,
        amount: total,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.goodsIssueVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.goodsIssueLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.goodsIssueVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu xuất kho ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.goodsIssueVoucher.delete({ where: { id } })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Định khoản TK Nợ mặc định theo lý do xuất:
//   bán hàng → 632 (giá vốn); sản xuất → 621 (CP NVL trực tiếp); khác → 632.
function defaultDebitAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.PRODUCTION
    ? CHART_OF_ACCOUNTS.DIRECT_MATERIAL_COST
    : CHART_OF_ACCOUNTS.COGS
}

// Định khoản TK Có (kho) mặc định theo lý do xuất:
//   sản xuất → 152 (NVL); bán hàng/khác → 156 (hàng hóa).
function defaultCreditAccount(category: GoodsIssueCategory): string {
  return category === GoodsIssueCategory.PRODUCTION
    ? CHART_OF_ACCOUNTS.MATERIAL
    : CHART_OF_ACCOUNTS.GOODS
}

function normalizeLines(category: GoodsIssueCategory, lines: CreateGoodsIssueLineDto[]) {
  return lines.map((line, i) => {
    const quantity = new Prisma.Decimal(line.quantity)
    const unitPrice = new Prisma.Decimal(line.unitPrice)
    return {
      lineNo: i + 1,
      itemId: line.itemId ?? null,
      itemName: line.itemName ?? null,
      warehouseId: line.warehouseId ?? null,
      debitAccount: line.debitAccount || defaultDebitAccount(category),
      creditAccount: line.creditAccount || defaultCreditAccount(category),
      unit: line.unit ?? null,
      quantity,
      unitPrice,
      amount: quantity.mul(unitPrice),
      lotNo: line.lotNo ?? null,
      expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
    }
  })
}

// Tổng tiền = Σ thành tiền các dòng.
function computeTotal(lines: { amount: Prisma.Decimal }[]): Prisma.Decimal {
  return lines.reduce((s, l) => s.add(l.amount), new Prisma.Decimal(0))
}

// Số chứng từ auto tăng: XK#####/YYYY (vd XK10601/2025), hậu tố năm theo ngày chứng từ.
// Lấy MAX(số) hiện có + 1 (không dùng count để tránh trùng khi dữ liệu nhập khẩu đứt quãng).
async function nextVoucherNo(tx: Prisma.TransactionClient, voucherDate: Date): Promise<string> {
  const year = voucherDate.getFullYear()
  const rows = await tx.goodsIssueVoucher.findMany({
    where: { voucherNo: { startsWith: 'XK' } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    // Lấy phần số trước dấu "/": "XK10601/2025" → 10601.
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  return `XK${String(maxSeq + 1).padStart(5, '0')}/${year}`
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function toIssueDto(v: IssueWithLines) {
  return {
    id: v.id,
    category: v.category,
    voucherNo: v.voucherNo,
    postingDate: toDateOnly(v.postingDate)!,
    voucherDate: toDateOnly(v.voucherDate)!,
    customerId: v.customerId,
    customerName: v.customerName,
    receiver: v.receiver,
    address: v.address,
    salesEmployeeId: v.salesEmployeeId,
    description: v.description,
    attachmentCount: v.attachmentCount,
    deliveryLocation: v.deliveryLocation,
    totalAmount: v.totalAmount.toString(),
    salesDocStatus: v.salesDocStatus,
    invoiceIssueStatus: v.invoiceIssueStatus,
    taxAuthorityCode: v.taxAuthorityCode,
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      itemId: l.itemId,
      itemName: l.itemName,
      warehouseId: l.warehouseId,
      debitAccount: l.debitAccount,
      creditAccount: l.creditAccount,
      unit: l.unit,
      quantity: l.quantity.toString(),
      unitPrice: l.unitPrice.toString(),
      amount: l.amount.toString(),
      lotNo: l.lotNo,
      expiryDate: toDateOnly(l.expiryDate),
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
