import type { Paginated } from '@app/shared'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, SalesPaymentMode, type Customer } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseCustomerXlsx } from './customer-import'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { CustomerFilterDto } from './dto/customer-filter.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: CustomerFilterDto): Promise<Paginated<ReturnType<typeof toCustomerDto>>> {
    const where: Prisma.CustomerWhereInput = {}
    if (filter.groupId) where.groupId = filter.groupId
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { taxCode: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ])

    const receivables = await this.receivableByCustomer(rows.map((r) => r.id))
    return {
      data: rows.map((r) => toCustomerDto(r, receivables.get(r.id))),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } })
    if (!customer) throw new NotFoundException(`Không tìm thấy khách hàng ${id}`)
    const receivables = await this.receivableByCustomer([id])
    return toCustomerDto(customer, receivables.get(id))
  }

  async create(dto: CreateCustomerDto) {
    const dup = await this.prisma.customer.findUnique({ where: { code: dto.code } })
    if (dup) throw new BadRequestException(`Mã khách hàng "${dto.code}" đã tồn tại`)
    const created = await this.prisma.customer.create({ data: toCreateData(dto) })
    return toCustomerDto(created)
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy khách hàng ${id}`)
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.customer.findUnique({ where: { code: dto.code } })
      if (dup) throw new BadRequestException(`Mã khách hàng "${dto.code}" đã tồn tại`)
    }
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        isSupplier: dto.isSupplier ?? undefined,
        isInternal: dto.isInternal ?? undefined,
        isActive: dto.isActive ?? undefined,
        debtReminderOn: dto.debtReminderOn ?? undefined,
        taxCode: dto.taxCode ?? undefined,
        budgetRelationCode: dto.budgetRelationCode ?? undefined,
        phone: dto.phone ?? undefined,
        website: dto.website ?? undefined,
        address: dto.address ?? undefined,
        groupId: dto.groupId ?? undefined,
        salesEmployeeId: dto.salesEmployeeId ?? undefined,
        contactName: dto.contactName ?? undefined,
        contactEmail: dto.contactEmail ?? undefined,
        contactPhone: dto.contactPhone ?? undefined,
      },
    })
    const receivables = await this.receivableByCustomer([id])
    return toCustomerDto(updated, receivables.get(id))
  }

  // Nhập khẩu khách hàng từ Excel — bỏ qua KH trùng mã, createMany theo lô 500.
  async importXlsx(buffer: Buffer) {
    const parsed = parseCustomerXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.customer.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const customers: Prisma.CustomerCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code) // chống trùng trong chính file
      customers.push({
        code: p.code,
        name: p.name,
        address: p.address,
        taxCode: p.taxCode,
        phone: p.phone,
      })
    }

    const chunk = 500
    for (let i = 0; i < customers.length; i += chunk) {
      await this.prisma.customer.createMany({ data: customers.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: customers.length, skipped: parsed.length - customers.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy khách hàng ${id}`)
    await this.prisma.customer.delete({ where: { id } })
    return { id }
  }

  // Công nợ phải thu = Σ tổng tiền chứng từ bán hàng chưa thu (§11.1) theo KH.
  private async receivableByCustomer(ids: string[]): Promise<Map<string, Prisma.Decimal>> {
    if (ids.length === 0) return new Map()
    const grouped = await this.prisma.salesVoucher.groupBy({
      by: ['customerId'],
      where: { customerId: { in: ids }, paymentMode: SalesPaymentMode.UNPAID, posted: true },
      _sum: { totalAmount: true },
    })
    return new Map(
      grouped
        .filter((g) => g.customerId)
        .map((g) => [g.customerId as string, g._sum.totalAmount ?? new Prisma.Decimal(0)]),
    )
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toCreateData(dto: CreateCustomerDto): Prisma.CustomerCreateInput {
  return {
    code: dto.code,
    name: dto.name,
    type: dto.type ?? undefined,
    isSupplier: dto.isSupplier ?? false,
    isInternal: dto.isInternal ?? false,
    isActive: dto.isActive ?? true,
    debtReminderOn: dto.debtReminderOn ?? true,
    taxCode: dto.taxCode ?? null,
    budgetRelationCode: dto.budgetRelationCode ?? null,
    phone: dto.phone ?? null,
    website: dto.website ?? null,
    address: dto.address ?? null,
    groupId: dto.groupId ?? null,
    salesEmployeeId: dto.salesEmployeeId ?? null,
    contactName: dto.contactName ?? null,
    contactEmail: dto.contactEmail ?? null,
    contactPhone: dto.contactPhone ?? null,
  }
}

function toCustomerDto(c: Customer, receivable?: Prisma.Decimal) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    isSupplier: c.isSupplier,
    isInternal: c.isInternal,
    isActive: c.isActive,
    debtReminderOn: c.debtReminderOn,
    taxCode: c.taxCode,
    budgetRelationCode: c.budgetRelationCode,
    phone: c.phone,
    website: c.website,
    address: c.address,
    groupId: c.groupId,
    salesEmployeeId: c.salesEmployeeId,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    receivable: (receivable ?? new Prisma.Decimal(0)).toString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
