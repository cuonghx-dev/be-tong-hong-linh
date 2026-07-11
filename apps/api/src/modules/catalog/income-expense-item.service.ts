import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type IncomeExpenseItem } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateIncomeExpenseItemDto } from './dto/create-income-expense-item.dto'
import { IncomeExpenseItemFilterDto } from './dto/income-expense-item-filter.dto'
import { UpdateIncomeExpenseItemDto } from './dto/update-income-expense-item.dto'
import { parseIncomeExpenseItemXlsx } from './income-expense-item-import'

@Injectable()
export class IncomeExpenseItemService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: IncomeExpenseItemFilterDto,
  ): Promise<Paginated<ReturnType<typeof toIncomeExpenseItemDto>>> {
    const where: Prisma.IncomeExpenseItemWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.type) where.type = filter.type
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.incomeExpenseItem.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.incomeExpenseItem.count({ where }),
    ])

    return {
      data: rows.map(toIncomeExpenseItemDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const item = await this.prisma.incomeExpenseItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException(`Không tìm thấy mục thu/chi ${id}`)
    return toIncomeExpenseItemDto(item)
  }

  async create(dto: CreateIncomeExpenseItemDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.incomeExpenseItem.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        recurring: dto.recurring ?? false,
        isActive: dto.isActive ?? true,
      },
    })
    return toIncomeExpenseItemDto(created)
  }

  async update(id: string, dto: UpdateIncomeExpenseItemDto) {
    const existing = await this.prisma.incomeExpenseItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy mục thu/chi ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.incomeExpenseItem.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        recurring: dto.recurring ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toIncomeExpenseItemDto(updated)
  }

  // Nhập khẩu mục thu/chi từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseIncomeExpenseItemXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.incomeExpenseItem.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.IncomeExpenseItemCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        type: p.type,
        recurring: p.recurring,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.incomeExpenseItem.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.incomeExpenseItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy mục thu/chi ${id}`)
    await this.prisma.incomeExpenseItem.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.incomeExpenseItem.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã mục thu/chi "${code}" đã tồn tại`)
  }
}

function toIncomeExpenseItemDto(i: IncomeExpenseItem) {
  return {
    id: i.id,
    code: i.code,
    name: i.name,
    type: i.type,
    recurring: i.recurring,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }
}
