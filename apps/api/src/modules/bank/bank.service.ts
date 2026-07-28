import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  BankVoucherCategory,
  BankVoucherType,
  PartnerType,
  Prisma,
  type BankVoucher,
  type BankVoucherLine,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { buildPartnerLookup } from '../../database/partner-lookup'
import { BookLockService } from '../book-lock/book-lock.service'
import { parseBankXlsx } from './bank-import'
import { BankVoucherFilterDto } from './dto/bank-voucher-filter.dto'
import { CreateBankVoucherDto, CreateBankVoucherLineDto } from './dto/create-bank-voucher.dto'
import { UpdateBankVoucherDto } from './dto/update-bank-voucher.dto'

type VoucherWithLines = BankVoucher & { lines: BankVoucherLine[] }

// TK đối ứng ngầm định của chứng từ tiền gửi theo loại đối tượng.
function counterAccount(type: PartnerType | undefined, isReceipt: boolean): string {
  if (type === PartnerType.CUSTOMER) return CHART_OF_ACCOUNTS.RECEIVABLE // 131
  if (type === PartnerType.SUPPLIER) return CHART_OF_ACCOUNTS.PAYABLE // 331
  if (type === PartnerType.EMPLOYEE) return CHART_OF_ACCOUNTS.ADVANCE // 141
  return isReceipt ? CHART_OF_ACCOUNTS.RECEIVABLE : CHART_OF_ACCOUNTS.PAYABLE
}

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  async list(filter: BankVoucherFilterDto): Promise<Paginated<ReturnType<typeof toVoucherDto>>> {
    const where: Prisma.BankVoucherWhereInput = {}
    if (filter.type) where.type = filter.type
    if (filter.category) where.category = filter.category
    if (filter.partnerId) where.partnerId = filter.partnerId
    if (filter.bankAccountNo) where.bankAccountNo = filter.bankAccountNo
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
      this.prisma.bankVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        // voucherNo (unique) làm tiebreaker: createdAt trùng nhau hàng loạt với dữ liệu
        // nhập Excel → thiếu nó thứ tự các dòng hòa không ổn định, UPDATE (vd. bỏ ghi/
        // ghi sổ) làm bảng xáo hàng sau mỗi refetch.
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }, { voucherNo: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.bankVoucher.count({ where }),
    ])

    return {
      data: rows.map(toVoucherDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.bankVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    return toVoucherDto(voucher)
  }

  // Xem trước số chứng từ kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  async previewNextVoucherNo(type: BankVoucherType, voucherDate?: string) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const voucherNo = await nextVoucherNo(this.prisma, type, date)
    return { voucherNo }
  }

  async create(dto: CreateBankVoucherDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    // CTNB phải có đủ 2 đầu tài khoản (đi = bankAccountNo, đến = receiverAccountNo).
    if (dto.type === BankVoucherType.TRANSFER && !dto.receiverAccountNo?.trim())
      throw new BadRequestException('Chuyển tiền nội bộ phải chọn tài khoản đến')
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, dto.type, new Date(dto.voucherDate))
      const lines = normalizeLines(dto.type, dto.lines)
      return tx.bankVoucher.create({
        data: {
          type: dto.type,
          category: dto.category,
          voucherNo,
          paymentMethod: dto.type === BankVoucherType.PAYMENT ? dto.paymentMethod ?? null : null,
          isBatchTransfer: dto.type === BankVoucherType.PAYMENT ? dto.isBatchTransfer ?? false : false,
          internalRef: dto.type === BankVoucherType.RECEIPT ? dto.internalRef ?? null : null,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          bankAccountNo: dto.bankAccountNo ?? null,
          bankName: dto.bankName ?? null,
          receiverAccountNo: dto.type !== BankVoucherType.RECEIPT ? dto.receiverAccountNo ?? null : null,
          receiverBankName: dto.type !== BankVoucherType.RECEIPT ? dto.receiverBankName ?? null : null,
          partnerType: dto.partnerType ?? null,
          partnerId: dto.partnerId ?? null,
          partnerName: dto.partnerName ?? null,
          address: dto.address ?? null,
          employeeId: dto.employeeId ?? null,
          reason: dto.reason ?? null,
          reference: dto.reference ?? null,
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

  async update(id: string, dto: UpdateBankVoucherDto) {
    const existing = await this.prisma.bankVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const isPayment = existing.type === BankVoucherType.PAYMENT
    const isTransfer = existing.type === BankVoucherType.TRANSFER
    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.BankVoucherUpdateInput = {
        category: dto.category ?? undefined,
        paymentMethod: isPayment ? dto.paymentMethod ?? undefined : undefined,
        isBatchTransfer: isPayment ? dto.isBatchTransfer ?? undefined : undefined,
        internalRef: existing.type === BankVoucherType.RECEIPT ? dto.internalRef ?? undefined : undefined,
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        bankAccountNo: dto.bankAccountNo ?? undefined,
        bankName: dto.bankName ?? undefined,
        receiverAccountNo: isPayment || isTransfer ? dto.receiverAccountNo ?? undefined : undefined,
        receiverBankName: isPayment || isTransfer ? dto.receiverBankName ?? undefined : undefined,
        partnerType: dto.partnerType ?? undefined,
        partnerId: dto.partnerId ?? undefined,
        partnerName: dto.partnerName ?? undefined,
        address: dto.address ?? undefined,
        employeeId: dto.employeeId ?? undefined,
        reason: dto.reason ?? undefined,
        reference: dto.reference ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        branchId: dto.branchId ?? undefined,
      }

      if (dto.lines) {
        const lines = normalizeLines(existing.type, dto.lines)
        data.totalAmount = sumAmount(lines)
        await tx.bankVoucherLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      }

      return tx.bankVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toVoucherDto(updated)
  }

  // Nhập khẩu từ file Excel — dùng số chứng từ có sẵn, bỏ qua chứng từ trùng số.
  async importXlsx(buffer: Buffer) {
    const parsed = parseBankXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.bankVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()
    const lookup = await buildPartnerLookup(this.prisma)

    const vouchers: Prisma.BankVoucherCreateManyInput[] = []
    const lines: Prisma.BankVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file
      const id = randomUUID()
      const isReceipt = p.type === BankVoucherType.RECEIPT
      const resolved = lookup.any(p.partnerName)
      vouchers.push({
        id,
        type: p.type,
        category: p.category,
        voucherNo: p.voucherNo,
        postingDate: p.date,
        voucherDate: p.date,
        bankAccountNo: p.bankAccountNo,
        partnerType: resolved?.type ?? null,
        partnerId: resolved?.id ?? null,
        partnerName: p.partnerName,
        employeeId: resolved?.type === PartnerType.EMPLOYEE ? resolved.id : null,
        reason: p.reason,
        totalAmount: new Prisma.Decimal(p.amount),
        branchId: p.branchId,
      })
      // TK đối ứng suy từ loại đối tượng: KH→131, NCC→331, NV→141; không rõ →
      // 131 (thu) / 331 (chi) để bút toán vẫn cân.
      const counter = counterAccount(resolved?.type, isReceipt)
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        description: p.description,
        debitAccount: isReceipt ? CHART_OF_ACCOUNTS.BANK_DEPOSIT : counter,
        creditAccount: isReceipt ? counter : CHART_OF_ACCOUNTS.BANK_DEPOSIT,
        amount: new Prisma.Decimal(p.amount),
        partnerId: resolved?.id ?? null,
        partnerName: p.partnerName,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.bankVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.bankVoucherLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }

  // Ghi sổ / bỏ ghi: chỉ đổi cờ posted (không đụng dòng hạch toán). Bỏ ghi =
  // đưa về nháp → loại khỏi sổ tiền gửi + báo cáo. Kỳ đã khóa sổ thì không cho đổi.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.bankVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.bankVoucher.update({
      where: { id },
      data: { posted },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return toVoucherDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.bankVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.bankVoucher.delete({ where: { id } })
    return { id }
  }

  async findVoucherNo(id: string) {
    const v = await this.prisma.bankVoucher.findUnique({
      where: { id },
      select: { voucherNo: true },
    })
    return v?.voucherNo ?? null
  }

  // ── Thu tiền gửi thu tiền khách hàng theo hóa đơn (RECEIPT) ─────────────────
  // Public API cho SalesModule (đối trừ công nợ): sinh thu tiền gửi Nợ 1121 /
  // Có 131 trong transaction của phía gọi. Dòng Có lấy từ input (TK công nợ
  // của từng chứng từ bán được đối trừ).
  async createCustomerReceipt(tx: Prisma.TransactionClient, input: BankCustomerReceiptInput) {
    const voucherNo = await nextVoucherNo(tx, BankVoucherType.RECEIPT, input.voucherDate)
    const created = await tx.bankVoucher.create({
      data: {
        type: BankVoucherType.RECEIPT,
        category: BankVoucherCategory.RECEIPT,
        voucherNo,
        ...customerReceiptData(input),
        lines: { create: customerReceiptLines(input) },
      },
      select: { id: true, voucherNo: true },
    })
    return created
  }

}

// Dữ liệu thu tiền gửi tự sinh từ thu tiền khách hàng theo hóa đơn (đối trừ công nợ).
export type BankCustomerReceiptInput = {
  postingDate: Date
  voucherDate: Date
  customerId: string | null
  customerName: string | null
  address: string | null
  reason: string
  branchId: string | null
  posted: boolean
  bankAccountNo: string | null
  bankName: string | null
  // Dòng hạch toán phía Có (TK công nợ của từng chứng từ bán được đối trừ); Nợ luôn 1121.
  lines: { description: string | null; creditAccount: string; amount: Prisma.Decimal }[]
}

function customerReceiptData(input: BankCustomerReceiptInput) {
  return {
    postingDate: input.postingDate,
    voucherDate: input.voucherDate,
    bankAccountNo: input.bankAccountNo,
    bankName: input.bankName,
    partnerType: PartnerType.CUSTOMER,
    partnerId: input.customerId,
    partnerName: input.customerName,
    address: input.address,
    reason: input.reason,
    branchId: input.branchId,
    posted: input.posted,
    totalAmount: sumAmount(input.lines),
  }
}

function customerReceiptLines(input: BankCustomerReceiptInput) {
  return input.lines.map((l, i) => ({
    lineNo: i + 1,
    description: l.description,
    debitAccount: CHART_OF_ACCOUNTS.BANK_DEPOSIT,
    creditAccount: l.creditAccount,
    amount: l.amount,
    partnerId: input.customerId,
    partnerName: input.customerName,
  }))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Định khoản mặc định: Thu → TK Nợ 1121; Chi → TK Có 1121; CTNB → cả 2 vế 1121 (§8.3).
function normalizeLines(type: BankVoucherType, lines: CreateBankVoucherLineDto[]) {
  return lines.map((line, i) => {
    const debitAccount =
      type !== BankVoucherType.PAYMENT
        ? line.debitAccount || CHART_OF_ACCOUNTS.BANK_DEPOSIT
        : line.debitAccount
    const creditAccount =
      type !== BankVoucherType.RECEIPT
        ? line.creditAccount || CHART_OF_ACCOUNTS.BANK_DEPOSIT
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
      partnerId: line.partnerId ?? null,
      partnerName: line.partnerName ?? null,
    }
  })
}

function sumAmount(lines: { amount: Prisma.Decimal }[]) {
  return lines.reduce((sum, l) => sum.add(l.amount), new Prisma.Decimal(0))
}

// Số chứng từ auto tăng theo prefix + năm (§8.1):
//   Thu: NTTK####/YYYY   Chi: UNC####/YYYY   Chuyển tiền nội bộ: CTNB####/YYYY
async function nextVoucherNo(
  tx: Prisma.TransactionClient,
  type: BankVoucherType,
  voucherDate: Date,
): Promise<string> {
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  // Số kế tiếp = MAX(số hiện có trong năm) + 1 — không dùng count vì số chứng từ
  // (nhất là dữ liệu nhập khẩu) có thể không liên tục → count+1 gây trùng.
  const rows = await tx.bankVoucher.findMany({
    where: { type, voucherDate: { gte: yearStart, lt: yearEnd } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    // Lấy phần số trước dấu "/": "NTTK0119/2026" → 119.
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  const seq = String(maxSeq + 1).padStart(4, '0')
  const prefix =
    type === BankVoucherType.RECEIPT ? 'NTTK' : type === BankVoucherType.TRANSFER ? 'CTNB' : 'UNC'
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
    paymentMethod: v.paymentMethod,
    isBatchTransfer: v.isBatchTransfer,
    internalRef: v.internalRef,
    postingDate: toDateOnly(v.postingDate),
    voucherDate: toDateOnly(v.voucherDate),
    bankAccountNo: v.bankAccountNo,
    bankName: v.bankName,
    receiverAccountNo: v.receiverAccountNo,
    receiverBankName: v.receiverBankName,
    partnerType: v.partnerType,
    partnerId: v.partnerId,
    partnerName: v.partnerName,
    address: v.address,
    employeeId: v.employeeId,
    reason: v.reason,
    reference: v.reference,
    attachmentCount: v.attachmentCount,
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
      partnerId: l.partnerId,
      partnerName: l.partnerName,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
