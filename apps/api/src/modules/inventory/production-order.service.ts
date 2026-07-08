import { type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  Prisma,
  type ProductionOrder,
  type ProductionOrderLine,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import {
  CreateProductionOrderDto,
  CreateProductionOrderLineDto,
} from './dto/create-production-order.dto'
import { ProductionOrderFilterDto } from './dto/production-order-filter.dto'
import { UpdateProductionOrderDto } from './dto/update-production-order.dto'
import { parseProductionOrderXlsx } from './production-order-import'

type OrderWithLines = ProductionOrder & { lines: ProductionOrderLine[] }

@Injectable()
export class ProductionOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ProductionOrderFilterDto): Promise<Paginated<ReturnType<typeof toOrderDto>>> {
    const where: Prisma.ProductionOrderWhereInput = {}
    if (filter.status) where.status = filter.status
    if (filter.fromDate || filter.toDate) {
      where.orderDate = {}
      if (filter.fromDate) where.orderDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.orderDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productionOrder.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.productionOrder.count({ where }),
    ])

    return {
      data: rows.map(toOrderDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!order) throw new NotFoundException(`Không tìm thấy lệnh sản xuất ${id}`)
    return toOrderDto(order)
  }

  async create(dto: CreateProductionOrderDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, new Date(dto.orderDate))
      return tx.productionOrder.create({
        data: {
          voucherNo,
          orderDate: new Date(dto.orderDate),
          description: dto.description ?? 'Lệnh sản xuất',
          receiptComplete: dto.receiptComplete ?? false,
          issueComplete: dto.issueComplete ?? false,
          status: dto.status ?? undefined,
          branchName: dto.branchName ?? null,
          lines: { create: normalizeLines(dto.lines) },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toOrderDto(created)
  }

  async update(id: string, dto: UpdateProductionOrderDto) {
    const existing = await this.prisma.productionOrder.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy lệnh sản xuất ${id}`)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProductionOrderUpdateInput = {
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        description: dto.description ?? undefined,
        receiptComplete: dto.receiptComplete ?? undefined,
        issueComplete: dto.issueComplete ?? undefined,
        status: dto.status ?? undefined,
        branchName: dto.branchName ?? undefined,
      }

      if (dto.lines) {
        // Ghi lại dòng: xóa hết dòng cũ rồi tạo lại.
        await tx.productionOrderLine.deleteMany({ where: { orderId: id } })
        data.lines = { create: normalizeLines(dto.lines) }
      }

      return tx.productionOrder.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toOrderDto(updated)
  }

  // Nhập khẩu lệnh sản xuất từ file Excel (mức tổng hợp). Bỏ qua số lệnh trùng.
  async importXlsx(buffer: Buffer) {
    const parsed = parseProductionOrderXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.productionOrder.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))

    const orders: Prisma.ProductionOrderCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      seen.add(p.voucherNo) // chống trùng trong chính file
      orders.push({
        id: randomUUID(),
        voucherNo: p.voucherNo,
        orderDate: p.date,
        description: p.description ?? 'Lệnh sản xuất',
        receiptComplete: p.receiptComplete,
        issueComplete: p.issueComplete,
        status: p.status,
        branchName: p.branchName,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < orders.length; i += chunk) {
      await this.prisma.productionOrder.createMany({ data: orders.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: orders.length, skipped: parsed.length - orders.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.productionOrder.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy lệnh sản xuất ${id}`)
    await this.prisma.productionOrder.delete({ where: { id } })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeLines(lines: CreateProductionOrderLineDto[]) {
  return lines.map((line, i) => ({
    lineNo: i + 1,
    lineType: line.lineType ?? undefined,
    itemId: line.itemId ?? null,
    itemName: line.itemName ?? null,
    unit: line.unit ?? null,
    quantity: new Prisma.Decimal(line.quantity),
    note: line.note ?? null,
  }))
}

// Số lệnh auto tăng: LSX##/MM.YYYY (vd LSX42/02.2026), hậu tố tháng.năm theo ngày lệnh.
// Lấy MAX(số) hiện có + 1 (không dùng count để tránh trùng khi dữ liệu nhập khẩu đứt quãng).
async function nextVoucherNo(tx: Prisma.TransactionClient, orderDate: Date): Promise<string> {
  const mm = String(orderDate.getMonth() + 1).padStart(2, '0')
  const yyyy = orderDate.getFullYear()
  const rows = await tx.productionOrder.findMany({
    where: { voucherNo: { startsWith: 'LSX' } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    // Lấy phần số trước dấu "/": "LSX42/02.2026" → 42.
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  return `LSX${String(maxSeq + 1).padStart(2, '0')}/${mm}.${yyyy}`
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function toOrderDto(o: OrderWithLines) {
  return {
    id: o.id,
    voucherNo: o.voucherNo,
    orderDate: toDateOnly(o.orderDate)!,
    description: o.description,
    receiptComplete: o.receiptComplete,
    issueComplete: o.issueComplete,
    status: o.status,
    branchName: o.branchName,
    lines: o.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      lineType: l.lineType,
      itemId: l.itemId,
      itemName: l.itemName,
      unit: l.unit,
      quantity: l.quantity.toString(),
      note: l.note,
    })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }
}
