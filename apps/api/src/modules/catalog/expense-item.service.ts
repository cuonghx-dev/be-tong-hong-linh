import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type ExpenseItem } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateExpenseItemDto } from './dto/create-expense-item.dto'
import { ExpenseItemFilterDto } from './dto/expense-item-filter.dto'
import { UpdateExpenseItemDto } from './dto/update-expense-item.dto'
import { parseExpenseItemXlsx } from './expense-item-import'

@Injectable()
export class ExpenseItemService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ExpenseItemFilterDto): Promise<Paginated<ReturnType<typeof toExpenseItemDto>>> {
    const where: Prisma.ExpenseItemWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    // FE tự dựng cây từ parentId; sắp theo mã để thứ tự anh em ổn định.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expenseItem.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.expenseItem.count({ where }),
    ])

    return {
      data: rows.map(toExpenseItemDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const item = await this.prisma.expenseItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException(`Không tìm thấy khoản mục chi phí ${id}`)
    return toExpenseItemDto(item)
  }

  async create(dto: CreateExpenseItemDto) {
    await this.ensureCodeFree(dto.code)
    const parentId = await this.resolveParentId(dto.parentId)
    const created = await this.prisma.expenseItem.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        parentId,
        isActive: dto.isActive ?? true,
      },
    })
    return toExpenseItemDto(created)
  }

  async update(id: string, dto: UpdateExpenseItemDto) {
    const existing = await this.prisma.expenseItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy khoản mục chi phí ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    let parentId: string | null | undefined
    if (dto.parentId !== undefined) {
      parentId = await this.resolveParentId(dto.parentId)
      if (parentId) await this.ensureNoCycle(id, parentId)
    }

    const updated = await this.prisma.expenseItem.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        parentId,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toExpenseItemDto(updated)
  }

  // Nhập khẩu khoản mục chi phí từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  // Sau khi tạo, tự gán cha theo tiền tố dấu chấm của mã (MTC.VL → cha MTC) nếu mã cha có trong DB.
  async importXlsx(buffer: Buffer) {
    const parsed = parseExpenseItemXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.expenseItem.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.ExpenseItemCreateManyInput[] = []
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
      await this.prisma.expenseItem.createMany({ data: data.slice(i, i + chunk) })
    }

    await this.linkParentsByCodePrefix(data.map((d) => d.code))

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.expenseItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy khoản mục chi phí ${id}`)
    const children = await this.prisma.expenseItem.count({ where: { parentId: id } })
    if (children > 0) {
      throw new ConflictException(`Khoản mục đang có ${children} khoản mục con, không thể xóa`)
    }
    await this.prisma.expenseItem.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.expenseItem.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã khoản mục chi phí "${code}" đã tồn tại`)
  }

  // '' / null → null (khoản mục gốc); có giá trị → phải tồn tại.
  private async resolveParentId(parentId: string | null | undefined): Promise<string | null> {
    if (!parentId) return null
    const parent = await this.prisma.expenseItem.findUnique({ where: { id: parentId } })
    if (!parent) throw new NotFoundException(`Không tìm thấy khoản mục cha ${parentId}`)
    return parent.id
  }

  // Chặn vòng lặp cha-con: cha mới không được là chính nó hoặc con cháu của nó.
  private async ensureNoCycle(id: string, newParentId: string) {
    let cursor: string | null = newParentId
    while (cursor) {
      if (cursor === id) {
        throw new ConflictException('Khoản mục cha không được là chính nó hoặc khoản mục con của nó')
      }
      const node: { parentId: string | null } | null = await this.prisma.expenseItem.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      })
      cursor = node?.parentId ?? null
    }
  }

  // Gán parentId cho các mã vừa tạo theo mã cha = phần trước dấu chấm cuối (A.B.C → A.B).
  private async linkParentsByCodePrefix(codes: string[]) {
    const childCodes = codes.filter((c) => c.includes('.'))
    if (childCodes.length === 0) return

    const parentCodes = [...new Set(childCodes.map((c) => c.slice(0, c.lastIndexOf('.'))))]
    const parents = await this.prisma.expenseItem.findMany({
      where: { code: { in: parentCodes } },
      select: { id: true, code: true },
    })
    const idByCode = new Map(parents.map((p) => [p.code, p.id]))

    const updates = childCodes.flatMap((code) => {
      const parentId = idByCode.get(code.slice(0, code.lastIndexOf('.')))
      if (!parentId) return []
      return this.prisma.expenseItem.update({ where: { code }, data: { parentId } })
    })
    if (updates.length > 0) await this.prisma.$transaction(updates)
  }
}

function toExpenseItemDto(i: ExpenseItem) {
  return {
    id: i.id,
    code: i.code,
    name: i.name,
    description: i.description,
    parentId: i.parentId,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }
}
