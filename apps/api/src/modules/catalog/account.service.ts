import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Account } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseAccountXlsx } from './account-import'
import { AccountFilterDto } from './dto/account-filter.dto'
import { CreateAccountDto } from './dto/create-account.dto'
import { UpdateAccountDto } from './dto/update-account.dto'

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: AccountFilterDto): Promise<Paginated<ReturnType<typeof toAccountDto>>> {
    const where: Prisma.AccountWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.nature) where.nature = filter.nature
    if (filter.keyword) {
      where.OR = [
        { number: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { nameEn: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    // FE tự dựng cây từ parentId; sắp theo số TK để thứ tự anh em ổn định.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        orderBy: { number: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.account.count({ where }),
    ])

    return {
      data: rows.map(toAccountDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const item = await this.prisma.account.findUnique({ where: { id } })
    if (!item) throw new NotFoundException(`Không tìm thấy tài khoản ${id}`)
    return toAccountDto(item)
  }

  async create(dto: CreateAccountDto) {
    await this.ensureNumberFree(dto.number)
    const parentId = await this.resolveParentId(dto.parentId)
    const created = await this.prisma.account.create({
      data: {
        number: dto.number,
        name: dto.name,
        nature: dto.nature,
        nameEn: dto.nameEn ?? null,
        description: dto.description ?? null,
        parentId,
        isActive: dto.isActive ?? true,
      },
    })
    return toAccountDto(created)
  }

  async update(id: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.account.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài khoản ${id}`)
    if (dto.number && dto.number !== existing.number) await this.ensureNumberFree(dto.number)

    let parentId: string | null | undefined
    if (dto.parentId !== undefined) {
      parentId = await this.resolveParentId(dto.parentId)
      if (parentId) await this.ensureNoCycle(id, parentId)
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        number: dto.number ?? undefined,
        name: dto.name ?? undefined,
        nature: dto.nature ?? undefined,
        nameEn: dto.nameEn ?? undefined,
        description: dto.description ?? undefined,
        parentId,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toAccountDto(updated)
  }

  // Nhập khẩu hệ thống tài khoản từ Excel. Bỏ qua số TK đã tồn tại (trong DB và trùng trong chính file).
  // Sau khi tạo, tự gán cha theo tiền tố số TK (1111 → cha 111) nếu số TK cha có trong DB.
  async importXlsx(buffer: Buffer) {
    const parsed = parseAccountXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const numbers = parsed.map((p) => p.number)
    const existing = await this.prisma.account.findMany({
      where: { number: { in: numbers } },
      select: { number: true },
    })
    const seen = new Set(existing.map((e) => e.number))

    const data: Prisma.AccountCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.number)) continue
      seen.add(p.number)
      data.push({
        number: p.number,
        name: p.name,
        nature: p.nature,
        nameEn: p.nameEn,
        description: p.description,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.account.createMany({ data: data.slice(i, i + chunk) })
    }

    await this.linkParentsByNumberPrefix(data.map((d) => d.number))

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài khoản ${id}`)
    const children = await this.prisma.account.count({ where: { parentId: id } })
    if (children > 0) {
      throw new ConflictException(`Tài khoản đang có ${children} tài khoản con, không thể xóa`)
    }
    await this.prisma.account.delete({ where: { id } })
    return { id }
  }

  private async ensureNumberFree(number: string) {
    const dup = await this.prisma.account.findUnique({ where: { number } })
    if (dup) throw new ConflictException(`Số tài khoản "${number}" đã tồn tại`)
  }

  // '' / null → null (tài khoản gốc); có giá trị → phải tồn tại.
  private async resolveParentId(parentId: string | null | undefined): Promise<string | null> {
    if (!parentId) return null
    const parent = await this.prisma.account.findUnique({ where: { id: parentId } })
    if (!parent) throw new NotFoundException(`Không tìm thấy tài khoản cha ${parentId}`)
    return parent.id
  }

  // Chặn vòng lặp cha-con: cha mới không được là chính nó hoặc con cháu của nó.
  private async ensureNoCycle(id: string, newParentId: string) {
    let cursor: string | null = newParentId
    while (cursor) {
      if (cursor === id) {
        throw new ConflictException('Tài khoản cha không được là chính nó hoặc tài khoản con của nó')
      }
      const node: { parentId: string | null } | null = await this.prisma.account.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      })
      cursor = node?.parentId ?? null
    }
  }

  // Gán parentId cho các số TK vừa tạo: cha = số TK dài nhất đang tồn tại là tiền tố thực sự.
  // (1111 → 111 → không có 11 → gốc). Xét trên toàn bộ tài khoản để bắc cầu qua khoảng trống.
  private async linkParentsByNumberPrefix(numbers: string[]) {
    if (numbers.length === 0) return
    const all = await this.prisma.account.findMany({ select: { id: true, number: true } })
    const idByNumber = new Map(all.map((a) => [a.number, a.id]))
    const allNumbers = new Set(idByNumber.keys())

    const updates = numbers.flatMap((number) => {
      // Tìm tiền tố dài nhất (ngắn hơn chính nó) có trong danh sách.
      for (let len = number.length - 1; len >= 1; len--) {
        const prefix = number.slice(0, len)
        const parentId = idByNumber.get(prefix)
        if (parentId && allNumbers.has(prefix)) {
          return this.prisma.account.update({ where: { number }, data: { parentId } })
        }
      }
      return []
    })
    if (updates.length > 0) await this.prisma.$transaction(updates)
  }
}

function toAccountDto(a: Account) {
  return {
    id: a.id,
    number: a.number,
    name: a.name,
    nature: a.nature,
    nameEn: a.nameEn,
    description: a.description,
    parentId: a.parentId,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}
