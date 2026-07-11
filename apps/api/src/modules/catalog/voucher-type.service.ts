import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type VoucherType } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateVoucherTypeDto } from './dto/create-voucher-type.dto'
import { UpdateVoucherTypeDto } from './dto/update-voucher-type.dto'
import { VoucherTypeFilterDto } from './dto/voucher-type-filter.dto'
import { parseVoucherTypeXlsx } from './voucher-type-import'

@Injectable()
export class VoucherTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: VoucherTypeFilterDto,
  ): Promise<Paginated<ReturnType<typeof toVoucherTypeDto>>> {
    const where: Prisma.VoucherTypeWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.voucherType.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.voucherType.count({ where }),
    ])

    return {
      data: rows.map(toVoucherTypeDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const row = await this.prisma.voucherType.findUnique({ where: { id } })
    if (!row) throw new NotFoundException(`Không tìm thấy loại chứng từ ${id}`)
    return toVoucherTypeDto(row)
  }

  async create(dto: CreateVoucherTypeDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.voucherType.create({
      data: {
        code: dto.code,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    })
    return toVoucherTypeDto(created)
  }

  async update(id: string, dto: UpdateVoucherTypeDto) {
    const existing = await this.prisma.voucherType.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy loại chứng từ ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.voucherType.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toVoucherTypeDto(updated)
  }

  // Nhập khẩu loại chứng từ từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseVoucherTypeXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.voucherType.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.VoucherTypeCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({ code: p.code, name: p.name, isActive: p.isActive })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.voucherType.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.voucherType.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy loại chứng từ ${id}`)
    await this.prisma.voucherType.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.voucherType.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã loại chứng từ "${code}" đã tồn tại`)
  }
}

function toVoucherTypeDto(t: VoucherType) {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
