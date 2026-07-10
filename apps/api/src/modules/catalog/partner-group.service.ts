import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type PartnerGroup } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreatePartnerGroupDto } from './dto/create-partner-group.dto'
import { PartnerGroupFilterDto } from './dto/partner-group-filter.dto'
import { UpdatePartnerGroupDto } from './dto/update-partner-group.dto'
import { parsePartnerGroupXlsx } from './partner-group-import'

@Injectable()
export class PartnerGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: PartnerGroupFilterDto): Promise<Paginated<ReturnType<typeof toPartnerGroupDto>>> {
    const where: Prisma.PartnerGroupWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.partnerGroup.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.partnerGroup.count({ where }),
    ])

    return {
      data: rows.map(toPartnerGroupDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const group = await this.prisma.partnerGroup.findUnique({ where: { id } })
    if (!group) throw new NotFoundException(`Không tìm thấy nhóm KH, NCC ${id}`)
    return toPartnerGroupDto(group)
  }

  async create(dto: CreatePartnerGroupDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.partnerGroup.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toPartnerGroupDto(created)
  }

  async update(id: string, dto: UpdatePartnerGroupDto) {
    const existing = await this.prisma.partnerGroup.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhóm KH, NCC ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.partnerGroup.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toPartnerGroupDto(updated)
  }

  // Nhập khẩu nhóm KH, NCC từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parsePartnerGroupXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.partnerGroup.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.PartnerGroupCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        description: p.description,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.partnerGroup.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.partnerGroup.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhóm KH, NCC ${id}`)
    // Nhóm có thể được gắn vào khách hàng / nhà cung cấp (groupId dạng tham chiếu lỏng).
    const counts = await this.prisma.$transaction([
      this.prisma.customer.count({ where: { groupId: id } }),
      this.prisma.supplier.count({ where: { groupId: id } }),
    ])
    const usedBy = counts.reduce((sum, n) => sum + n, 0)
    if (usedBy > 0) {
      throw new ConflictException(`Nhóm đang gắn với ${usedBy} khách hàng/nhà cung cấp, không thể xóa`)
    }
    await this.prisma.partnerGroup.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.partnerGroup.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã nhóm KH, NCC "${code}" đã tồn tại`)
  }
}

function toPartnerGroupDto(g: PartnerGroup) {
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    description: g.description,
    isActive: g.isActive,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }
}
