import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Warehouse } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateWarehouseDto } from './dto/create-warehouse.dto'
import { UpdateWarehouseDto } from './dto/update-warehouse.dto'
import { WarehouseFilterDto } from './dto/warehouse-filter.dto'
import { parseWarehouseXlsx } from './warehouse-import'

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: WarehouseFilterDto): Promise<Paginated<ReturnType<typeof toWarehouseDto>>> {
    const where: Prisma.WarehouseWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { address: { contains: filter.keyword, mode: 'insensitive' } },
        { branch: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.warehouse.count({ where }),
    ])

    return {
      data: rows.map(toWarehouseDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } })
    if (!warehouse) throw new NotFoundException(`Không tìm thấy kho ${id}`)
    return toWarehouseDto(warehouse)
  }

  async create(dto: CreateWarehouseDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.warehouse.create({
      data: {
        code: dto.code,
        name: dto.name,
        address: dto.address ?? null,
        branch: dto.branch ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toWarehouseDto(created)
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy kho ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        address: dto.address ?? undefined,
        branch: dto.branch ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toWarehouseDto(updated)
  }

  // Nhập khẩu kho từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseWarehouseXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.warehouse.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.WarehouseCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        address: p.address,
        branch: p.branch,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.warehouse.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.warehouse.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy kho ${id}`)
    // Kho có thể được gắn vào hàng hóa (defaultWarehouseCode theo mã) hoặc dòng chứng từ
    // nhập/xuất kho (warehouseId theo id) — tham chiếu lỏng, không FK.
    const counts = await this.prisma.$transaction([
      this.prisma.product.count({ where: { defaultWarehouseCode: existing.code } }),
      this.prisma.purchaseVoucherLine.count({ where: { warehouseId: id } }),
      this.prisma.inventoryReceiptLine.count({ where: { warehouseId: id } }),
      this.prisma.goodsIssueLine.count({ where: { warehouseId: id } }),
    ])
    const usedBy = counts.reduce((sum, n) => sum + n, 0)
    if (usedBy > 0) {
      throw new ConflictException(`Kho đang gắn với ${usedBy} bản ghi khác, không thể xóa`)
    }
    await this.prisma.warehouse.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.warehouse.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã kho "${code}" đã tồn tại`)
  }
}

function toWarehouseDto(w: Warehouse) {
  return {
    id: w.id,
    code: w.code,
    name: w.name,
    address: w.address,
    branch: w.branch,
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }
}
