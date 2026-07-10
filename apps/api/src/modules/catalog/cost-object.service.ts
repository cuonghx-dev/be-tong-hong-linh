import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type CostObject } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseCostObjectXlsx } from './cost-object-import'
import { CostObjectFilterDto } from './dto/cost-object-filter.dto'
import { CreateCostObjectDto } from './dto/create-cost-object.dto'
import { UpdateCostObjectDto } from './dto/update-cost-object.dto'

@Injectable()
export class CostObjectService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: CostObjectFilterDto): Promise<Paginated<ReturnType<typeof toCostObjectDto>>> {
    const where: Prisma.CostObjectWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.type) where.type = filter.type
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.costObject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.costObject.count({ where }),
    ])

    return {
      data: rows.map(toCostObjectDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const costObject = await this.prisma.costObject.findUnique({ where: { id } })
    if (!costObject) throw new NotFoundException(`Không tìm thấy đối tượng THCP ${id}`)
    return toCostObjectDto(costObject)
  }

  async create(dto: CreateCostObjectDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.costObject.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type ?? undefined,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toCostObjectDto(created)
  }

  async update(id: string, dto: UpdateCostObjectDto) {
    const existing = await this.prisma.costObject.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy đối tượng THCP ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.costObject.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        description: dto.description ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toCostObjectDto(updated)
  }

  // Nhập khẩu đối tượng THCP từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseCostObjectXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.costObject.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.CostObjectCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        type: p.type,
        description: p.description,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.costObject.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.costObject.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy đối tượng THCP ${id}`)
    await this.prisma.costObject.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.costObject.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã đối tượng THCP "${code}" đã tồn tại`)
  }
}

function toCostObjectDto(c: CostObject) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    description: c.description,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
