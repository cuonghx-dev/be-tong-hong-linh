import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Unit } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateUnitDto } from './dto/create-unit.dto'
import { UnitFilterDto } from './dto/unit-filter.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'
import { parseUnitXlsx } from './unit-import'

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: UnitFilterDto): Promise<Paginated<ReturnType<typeof toUnitDto>>> {
    const where: Prisma.UnitWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.unit.count({ where }),
    ])

    return {
      data: rows.map(toUnitDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const row = await this.prisma.unit.findUnique({ where: { id } })
    if (!row) throw new NotFoundException(`Không tìm thấy đơn vị tính ${id}`)
    return toUnitDto(row)
  }

  async create(dto: CreateUnitDto) {
    await this.ensureNameFree(dto.name)
    const created = await this.prisma.unit.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toUnitDto(created)
  }

  async update(id: string, dto: UpdateUnitDto) {
    const existing = await this.prisma.unit.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy đơn vị tính ${id}`)
    if (dto.name && dto.name !== existing.name) await this.ensureNameFree(dto.name)

    const updated = await this.prisma.unit.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        description: dto.description === undefined ? undefined : dto.description,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toUnitDto(updated)
  }

  // Nhập khẩu đơn vị tính từ Excel. Bỏ qua tên đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseUnitXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const names = parsed.map((p) => p.name)
    const existing = await this.prisma.unit.findMany({
      where: { name: { in: names } },
      select: { name: true },
    })
    const seen = new Set(existing.map((e) => e.name))

    const data: Prisma.UnitCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.name)) continue
      seen.add(p.name)
      data.push({ name: p.name, description: p.description, isActive: p.isActive })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.unit.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.unit.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy đơn vị tính ${id}`)
    await this.prisma.unit.delete({ where: { id } })
    return { id }
  }

  private async ensureNameFree(name: string) {
    const dup = await this.prisma.unit.findUnique({ where: { name } })
    if (dup) throw new ConflictException(`Đơn vị tính "${name}" đã tồn tại`)
  }
}

function toUnitDto(u: Unit) {
  return {
    id: u.id,
    name: u.name,
    description: u.description,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}
