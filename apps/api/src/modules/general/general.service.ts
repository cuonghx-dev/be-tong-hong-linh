import { type Paginated } from '@app/shared'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma, type GeneralVoucher, type GeneralVoucherLine } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { BookLockService } from '../book-lock/book-lock.service'
import { parseGeneralXlsx } from './general-import'
import { GeneralVoucherFilterDto } from './dto/general-voucher-filter.dto'
import { CreateGeneralVoucherDto, CreateGeneralVoucherLineDto } from './dto/create-general-voucher.dto'
import { UpdateGeneralVoucherDto } from './dto/update-general-voucher.dto'

type VoucherWithLines = GeneralVoucher & { lines: GeneralVoucherLine[] }

@Injectable()
export class GeneralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  async list(filter: GeneralVoucherFilterDto): Promise<Paginated<ReturnType<typeof toVoucherDto>>> {
    const where: Prisma.GeneralVoucherWhereInput = {}
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.generalVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.generalVoucher.count({ where }),
    ])

    return {
      data: rows.map(toVoucherDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.generalVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    return toVoucherDto(voucher)
  }

  // Xem trước số chứng từ kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  async previewNextVoucherNo(voucherDate?: string) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const voucherNo = await nextVoucherNo(this.prisma, date)
    return { voucherNo }
  }

  // Định khoản tự nhập: TK Nợ/Có phải khác nhau và có trong hệ thống tài khoản.
  // Chỉ chạy ở create/update (đường import ghi TK trống chủ ý — bổ sung khi sửa).
  private async assertLineAccountsValid(lines: { debitAccount: string; creditAccount: string }[]) {
    for (const [i, l] of lines.entries()) {
      if (l.debitAccount === l.creditAccount)
        throw new BadRequestException(`Dòng ${i + 1}: TK Nợ và TK Có không được trùng nhau`)
    }
    const codes = [...new Set(lines.flatMap((l) => [l.debitAccount, l.creditAccount]))]
    const found = await this.prisma.account.findMany({
      where: { number: { in: codes } },
      select: { number: true },
    })
    const known = new Set(found.map((a) => a.number))
    const missing = codes.filter((c) => !known.has(c))
    if (missing.length > 0)
      throw new BadRequestException(
        `TK không có trong hệ thống tài khoản: ${missing.join(', ')}`,
      )
  }

  async create(dto: CreateGeneralVoucherDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    await this.assertLineAccountsValid(dto.lines)
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, new Date(dto.voucherDate))
      const lines = normalizeLines(dto.lines)
      return tx.generalVoucher.create({
        data: {
          voucherNo,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          description: dto.description ?? null,
          referenceNo: dto.referenceNo ?? null,
          branchId: dto.branchId ?? null,
          totalAmount: sumAmount(lines),
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(created)
  }

  async update(id: string, dto: UpdateGeneralVoucherDto) {
    const existing = await this.prisma.generalVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.GeneralVoucherUpdateInput = {
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        description: dto.description ?? undefined,
        referenceNo: dto.referenceNo ?? undefined,
        branchId: dto.branchId ?? undefined,
      }

      if (dto.lines) {
        await this.assertLineAccountsValid(dto.lines)
        const lines = normalizeLines(dto.lines)
        data.totalAmount = sumAmount(lines)
        await tx.generalVoucherLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      }

      return tx.generalVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(updated)
  }

  // Nhập khẩu từ file Excel — dùng số chứng từ có sẵn, bỏ qua chứng từ trùng số.
  async importXlsx(buffer: Buffer) {
    const parsed = parseGeneralXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.generalVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()

    const vouchers: Prisma.GeneralVoucherCreateManyInput[] = []
    const lines: Prisma.GeneralVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.postingDate <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file
      const id = randomUUID()
      vouchers.push({
        id,
        voucherNo: p.voucherNo,
        postingDate: p.postingDate,
        voucherDate: p.voucherDate,
        description: p.description,
        totalAmount: new Prisma.Decimal(p.amount),
        branchId: p.branchId,
      })
      // File tổng hợp không có định khoản chi tiết → 1 dòng TK trống, bổ sung khi sửa.
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        description: p.description,
        debitAccount: '',
        creditAccount: '',
        amount: new Prisma.Decimal(p.amount),
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.generalVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.generalVoucherLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }

  // Ghi sổ / bỏ ghi — đổi cờ posted, không đụng dữ liệu chứng từ.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.generalVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.generalVoucher.update({
      where: { id },
      data: { posted },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return toVoucherDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.generalVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.generalVoucher.delete({ where: { id } })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// NVK không có định khoản mặc định — TK Nợ/Có do người dùng tự nhập.
function normalizeLines(lines: CreateGeneralVoucherLineDto[]) {
  return lines.map((line, i) => ({
    lineNo: i + 1,
    description: line.description ?? null,
    debitAccount: line.debitAccount,
    creditAccount: line.creditAccount,
    amount: new Prisma.Decimal(line.amount),
    operation: line.operation ?? null,
    debitPartnerId: line.debitPartnerId ?? null,
    debitPartnerName: line.debitPartnerName ?? null,
    creditPartnerId: line.creditPartnerId ?? null,
    creditPartnerName: line.creditPartnerName ?? null,
  }))
}

function sumAmount(lines: { amount: Prisma.Decimal }[]) {
  return lines.reduce((sum, l) => sum.add(l.amount), new Prisma.Decimal(0))
}

// Số chứng từ auto tăng theo năm: NVK<seq>/YYYY (vd NVK261/2025, không pad 0).
// Số kế tiếp = MAX(số hiện có trong năm) + 1 — không dùng count vì dữ liệu
// nhập khẩu có thể đứt quãng → count+1 gây trùng (xem cash.service.ts).
async function nextVoucherNo(tx: Prisma.TransactionClient, voucherDate: Date): Promise<string> {
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const rows = await tx.generalVoucher.findMany({
    where: { voucherDate: { gte: yearStart, lt: yearEnd } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    // Lấy phần số trước dấu "/": "NVK261/2025" → 261.
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  return `NVK${maxSeq + 1}/${year}`
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toVoucherDto(v: VoucherWithLines) {
  return {
    id: v.id,
    voucherNo: v.voucherNo,
    postingDate: toDateOnly(v.postingDate),
    voucherDate: toDateOnly(v.voucherDate),
    dueDate: v.dueDate ? toDateOnly(v.dueDate) : null,
    description: v.description,
    referenceNo: v.referenceNo,
    totalAmount: v.totalAmount.toString(),
    branchId: v.branchId,
    posted: v.posted,
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      description: l.description,
      debitAccount: l.debitAccount,
      creditAccount: l.creditAccount,
      amount: l.amount.toString(),
      operation: l.operation,
      debitPartnerId: l.debitPartnerId,
      debitPartnerName: l.debitPartnerName,
      creditPartnerId: l.creditPartnerId,
      creditPartnerName: l.creditPartnerName,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
