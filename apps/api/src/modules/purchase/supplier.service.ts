import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Supplier } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { SupplierFilterDto } from './dto/supplier-filter.dto'
import { parseSupplierXlsx } from './supplier-import'
import { UpdateSupplierDto } from './dto/update-supplier.dto'

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: SupplierFilterDto): Promise<Paginated<ReturnType<typeof toSupplierDto>>> {
    const where: Prisma.SupplierWhereInput = {}
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
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ])

    return {
      data: rows.map(toSupplierDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } })
    if (!supplier) throw new NotFoundException(`Không tìm thấy nhà cung cấp ${id}`)
    return toSupplierDto(supplier)
  }

  async create(dto: CreateSupplierDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.supplier.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type ?? undefined,
        isCustomer: dto.isCustomer ?? false,
        taxCode: dto.taxCode ?? null,
        budgetRelationCode: dto.budgetRelationCode ?? null,
        phone: dto.phone ?? null,
        website: dto.website ?? null,
        address: dto.address ?? null,
        groupId: dto.groupId ?? null,
        employeeId: dto.employeeId ?? null,
        isInternal: dto.isInternal ?? false,
        invoiceRisk: dto.invoiceRisk ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toSupplierDto(created)
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhà cung cấp ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        isCustomer: dto.isCustomer ?? undefined,
        taxCode: dto.taxCode ?? undefined,
        budgetRelationCode: dto.budgetRelationCode ?? undefined,
        phone: dto.phone ?? undefined,
        website: dto.website ?? undefined,
        address: dto.address ?? undefined,
        groupId: dto.groupId ?? undefined,
        employeeId: dto.employeeId ?? undefined,
        isInternal: dto.isInternal ?? undefined,
        invoiceRisk: dto.invoiceRisk ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toSupplierDto(updated)
  }

  // Nhập khẩu NCC từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseSupplierXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.supplier.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.SupplierCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        type: p.type,
        taxCode: p.taxCode,
        budgetRelationCode: p.budgetRelationCode,
        phone: p.phone,
        website: p.website,
        address: p.address,
        debtAmount: new Prisma.Decimal(p.debtAmount),
        invoiceRisk: p.invoiceRisk,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.supplier.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhà cung cấp ${id}`)
    const usedBy = await this.prisma.purchaseVoucher.count({ where: { supplierId: id } })
    if (usedBy > 0) {
      throw new ConflictException(`Nhà cung cấp đang gắn với ${usedBy} chứng từ, không thể xóa`)
    }
    await this.prisma.supplier.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.supplier.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã nhà cung cấp "${code}" đã tồn tại`)
  }
}

function toSupplierDto(s: Supplier) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    type: s.type,
    isCustomer: s.isCustomer,
    taxCode: s.taxCode,
    budgetRelationCode: s.budgetRelationCode,
    phone: s.phone,
    website: s.website,
    address: s.address,
    groupId: s.groupId,
    employeeId: s.employeeId,
    isInternal: s.isInternal,
    debtAmount: s.debtAmount.toString(),
    invoiceRisk: s.invoiceRisk,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}
