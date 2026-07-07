import type { Paginated } from '@app/shared'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { InvoiceIssueStatus, Prisma, type Invoice, type SalesVoucher } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateInvoiceDto } from './dto/create-invoice.dto'
import { InvoiceFilterDto } from './dto/invoice-filter.dto'
import { parseInvoiceXlsx } from './invoice-import'

type InvoiceWithVoucher = Invoice & { salesVoucher: SalesVoucher | null }

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: InvoiceFilterDto): Promise<Paginated<ReturnType<typeof toInvoiceDto>>> {
    const where: Prisma.InvoiceWhereInput = {}
    if (filter.issueStatus) where.issueStatus = filter.issueStatus
    if (filter.customerId) where.customerId = filter.customerId
    if (filter.fromDate || filter.toDate) {
      where.invoiceDate = {}
      if (filter.fromDate) where.invoiceDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.invoiceDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { invoiceNo: { contains: filter.keyword, mode: 'insensitive' } },
        { customerName: { contains: filter.keyword, mode: 'insensitive' } },
        { taxAuthorityCode: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: { salesVoucher: true },
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ])

    return {
      data: rows.map(toInvoiceDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { salesVoucher: true },
    })
    if (!invoice) throw new NotFoundException(`Không tìm thấy hóa đơn ${id}`)
    return toInvoiceDto(invoice)
  }

  // Tạo hóa đơn nhập tay (header-only) → trạng thái chưa phát hành.
  async create(dto: CreateInvoiceDto) {
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceType: dto.invoiceType ?? 'Hóa đơn GTGT',
        invoiceDate: new Date(dto.invoiceDate),
        customerId: dto.customerId ?? null,
        customerName: dto.customerName ?? null,
        paymentForm: dto.paymentForm ?? null,
        bankAccount: dto.bankAccount ?? null,
        symbol: dto.symbol ?? null,
        templateNo: dto.templateNo ?? null,
        totalAmount: new Prisma.Decimal(dto.totalAmount),
        branchId: dto.branchId ?? null,
      },
      include: { salesVoucher: true },
    })
    return toInvoiceDto(invoice)
  }

  // Nhập khẩu hóa đơn từ Excel — bỏ qua HĐ trùng số, createMany theo lô 500.
  async importXlsx(buffer: Buffer) {
    const parsed = parseInvoiceXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.invoiceNo)
    const existing = await this.prisma.invoice.findMany({
      where: { invoiceNo: { in: nos } },
      select: { invoiceNo: true },
    })
    const seen = new Set(existing.map((e) => e.invoiceNo))

    const invoices: Prisma.InvoiceCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.invoiceNo)) continue
      seen.add(p.invoiceNo) // chống trùng trong chính file
      const issued = p.issueStatus === InvoiceIssueStatus.CODE_ISSUED
      invoices.push({
        invoiceNo: p.invoiceNo,
        invoiceType: p.invoiceType,
        status: p.status ?? (issued ? 'Đã cấp mã' : 'Hóa đơn mới'),
        issueStatus: p.issueStatus,
        taxAuthorityCode: p.taxAuthorityCode,
        sendStatus: p.sendStatus,
        customerReceived: p.customerReceived,
        invoiceDate: p.date,
        customerName: p.customerName,
        totalAmount: new Prisma.Decimal(p.totalAmount),
        posted: issued,
      })
    }

    const chunk = 500
    for (let i = 0; i < invoices.length; i += chunk) {
      await this.prisma.invoice.createMany({ data: invoices.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: invoices.length, skipped: parsed.length - invoices.length }
  }

  // Phát hành hóa đơn (§5) → cấp số + mã CQT + mã tra cứu (§11.3).
  async issue(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } })
    if (!invoice) throw new NotFoundException(`Không tìm thấy hóa đơn ${id}`)
    if (invoice.issueStatus === InvoiceIssueStatus.CODE_ISSUED) {
      throw new BadRequestException('Hóa đơn đã được cấp mã')
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      const invoiceNo = invoice.invoiceNo ?? (await nextInvoiceNo(tx, invoice.invoiceDate))
      const lookupCode = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
      const yy = String(invoice.invoiceDate.getFullYear()).slice(2)
      const taxAuthorityCode = `M1-${yy}-QCFOR-${invoiceNo.padStart(11, '0')}`
      return tx.invoice.update({
        where: { id },
        data: {
          invoiceNo,
          issueStatus: InvoiceIssueStatus.CODE_ISSUED,
          status: 'Đã cấp mã',
          symbol: invoice.symbol ?? `1C${yy}MYY`,
          templateNo: invoice.templateNo ?? '1',
          taxAuthorityCode,
          taxSubmitStatus: 'HĐ hợp lệ',
          sendStatus: 'Chưa gửi',
          lookupCode,
          lookupUrl: `https://www.meinvoice.vn/tra-cuu/?sc=${lookupCode}`,
          posted: true,
        },
        include: { salesVoucher: true },
      })
    })
    return toInvoiceDto(issued)
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Số hóa đơn auto tăng theo năm, dạng 8 chữ số (vd 00004692).
async function nextInvoiceNo(tx: Prisma.TransactionClient, date: Date): Promise<string> {
  const year = date.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const count = await tx.invoice.count({
    where: { invoiceNo: { not: null }, invoiceDate: { gte: yearStart, lt: yearEnd } },
  })
  return String(count + 1).padStart(8, '0')
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toInvoiceDto(inv: InvoiceWithVoucher) {
  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    invoiceType: inv.invoiceType,
    status: inv.status,
    issueStatus: inv.issueStatus,
    templateNo: inv.templateNo,
    symbol: inv.symbol,
    taxAuthorityCode: inv.taxAuthorityCode,
    taxSubmitStatus: inv.taxSubmitStatus,
    sendStatus: inv.sendStatus,
    customerReceived: inv.customerReceived,
    lookupCode: inv.lookupCode,
    lookupUrl: inv.lookupUrl,
    paymentForm: inv.paymentForm,
    bankAccount: inv.bankAccount,
    invoiceDate: toDateOnly(inv.invoiceDate),
    posted: inv.posted,
    salesVoucherId: inv.salesVoucherId,
    salesVoucherNo: inv.salesVoucher?.voucherNo ?? null,
    customerId: inv.customerId,
    customerName: inv.customerName,
    totalAmount: inv.totalAmount.toString(),
    branchId: inv.branchId,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  }
}
