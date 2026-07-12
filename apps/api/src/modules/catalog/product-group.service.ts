import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type ProductGroup } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateProductGroupDto } from './dto/create-product-group.dto'
import { ProductGroupFilterDto } from './dto/product-group-filter.dto'
import { UpdateProductGroupDto } from './dto/update-product-group.dto'
import { parseProductGroupXlsx } from './product-group-import'

@Injectable()
export class ProductGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ProductGroupFilterDto): Promise<Paginated<ReturnType<typeof toProductGroupDto>>> {
    const where: Prisma.ProductGroupWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productGroup.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.productGroup.count({ where }),
    ])

    return {
      data: rows.map(toProductGroupDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const group = await this.prisma.productGroup.findUnique({ where: { id } })
    if (!group) throw new NotFoundException(`Không tìm thấy nhóm VTHH ${id}`)
    return toProductGroupDto(group)
  }

  async create(dto: CreateProductGroupDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.productGroup.create({
      data: {
        code: dto.code,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    })
    return toProductGroupDto(created)
  }

  async update(id: string, dto: UpdateProductGroupDto) {
    const existing = await this.prisma.productGroup.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhóm VTHH ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.productGroup.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toProductGroupDto(updated)
  }

  // Nhập khẩu nhóm VTHH từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseProductGroupXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.productGroup.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.ProductGroupCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.productGroup.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.productGroup.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhóm VTHH ${id}`)
    // Nhóm có thể được gắn vào vật tư, hàng hóa (groupCode dạng tham chiếu lỏng theo mã).
    const usedBy = await this.prisma.product.count({ where: { groupCode: existing.code } })
    if (usedBy > 0) {
      throw new ConflictException(`Nhóm đang gắn với ${usedBy} vật tư, hàng hóa, không thể xóa`)
    }
    await this.prisma.productGroup.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.productGroup.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã nhóm VTHH "${code}" đã tồn tại`)
  }
}

function toProductGroupDto(g: ProductGroup) {
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    isActive: g.isActive,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }
}
