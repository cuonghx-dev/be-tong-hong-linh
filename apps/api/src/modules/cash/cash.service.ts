import {
  CASH_PAYMENT_DEBIT_ACCOUNT,
  CASH_RECEIPT_CREDIT_ACCOUNT,
  CHART_OF_ACCOUNTS,
  type Paginated,
} from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { CashVoucherType, Prisma, type CashVoucher, type CashVoucherLine } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseCashXlsx } from './cash-import'
import { CashVoucherFilterDto } from './dto/cash-voucher-filter.dto'
import { CreateCashVoucherDto, CreateCashVoucherLineDto } from './dto/create-cash-voucher.dto'
import { UpdateCashVoucherDto } from './dto/update-cash-voucher.dto'

type VoucherWithLines = CashVoucher & { lines: CashVoucherLine[] }

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

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
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.cashVoucher.count({ where }),
    ])

    return {
      data: rows.map(toVoucherDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.cashVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy phiếu ${id}`)
    return toVoucherDto(voucher)
  }

  async create(dto: CreateCashVoucherDto) {
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

    const vouchers: Prisma.CashVoucherCreateManyInput[] = []
    const lines: Prisma.CashVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      seen.add(p.voucherNo) // chống trùng trong chính file
      const id = randomUUID()
      const isReceipt = p.type === CashVoucherType.RECEIPT
      vouchers.push({
        id,
        type: p.type,
        category: p.category,
        voucherNo: p.voucherNo,
        postingDate: p.date,
        voucherDate: p.date,
        partnerName: p.partnerName,
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

  async remove(id: string) {
    const existing = await this.prisma.cashVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu ${id}`)
    await this.prisma.cashVoucher.delete({ where: { id } })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Định khoản mặc định: Thu → TK Nợ 1111; Chi → TK Có 1111 (§8.3).
function normalizeLines(type: CashVoucherType, lines: CreateCashVoucherLineDto[]) {
  return lines.map((line, i) => ({
    lineNo: i + 1,
    description: line.description ?? null,
    debitAccount:
      type === CashVoucherType.RECEIPT
        ? line.debitAccount || CHART_OF_ACCOUNTS.CASH_ON_HAND
        : line.debitAccount,
    creditAccount:
      type === CashVoucherType.PAYMENT
        ? line.creditAccount || CHART_OF_ACCOUNTS.CASH_ON_HAND
        : line.creditAccount,
    amount: new Prisma.Decimal(line.amount),
    operation: line.operation ?? null,
    partnerId: line.partnerId ?? null,
    partnerName: line.partnerName ?? null,
    costItemId: line.costItemId ?? null,
    bankAccountNo: line.bankAccountNo ?? null,
    bankName: line.bankName ?? null,
  }))
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
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
