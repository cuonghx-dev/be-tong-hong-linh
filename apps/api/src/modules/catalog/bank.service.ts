import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Bank } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseBankXlsx } from './bank-import'
import { BankFilterDto } from './dto/bank-filter.dto'
import { CreateBankDto } from './dto/create-bank.dto'
import { UpdateBankDto } from './dto/update-bank.dto'

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: BankFilterDto): Promise<Paginated<ReturnType<typeof toBankDto>>> {
    const where: Prisma.BankWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { shortName: { contains: filter.keyword, mode: 'insensitive' } },
        { fullName: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bank.findMany({
        where,
        orderBy: { shortName: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.bank.count({ where }),
    ])

    return {
      data: rows.map(toBankDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const bank = await this.prisma.bank.findUnique({ where: { id } })
    if (!bank) throw new NotFoundException(`Không tìm thấy ngân hàng ${id}`)
    return toBankDto(bank)
  }

  async create(dto: CreateBankDto) {
    await this.ensureShortNameFree(dto.shortName)
    const created = await this.prisma.bank.create({
      data: {
        shortName: dto.shortName,
        fullName: dto.fullName,
        isActive: dto.isActive ?? true,
      },
    })
    return toBankDto(created)
  }

  async update(id: string, dto: UpdateBankDto) {
    const existing = await this.prisma.bank.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy ngân hàng ${id}`)
    if (dto.shortName && dto.shortName !== existing.shortName)
      await this.ensureShortNameFree(dto.shortName)

    const updated = await this.prisma.bank.update({
      where: { id },
      data: {
        shortName: dto.shortName ?? undefined,
        fullName: dto.fullName ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toBankDto(updated)
  }

  // Nhập khẩu ngân hàng từ Excel. Bỏ qua tên viết tắt đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseBankXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const shortNames = parsed.map((p) => p.shortName)
    const existing = await this.prisma.bank.findMany({
      where: { shortName: { in: shortNames } },
      select: { shortName: true },
    })
    const seen = new Set(existing.map((e) => e.shortName))

    const data: Prisma.BankCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.shortName)) continue
      seen.add(p.shortName)
      data.push({
        shortName: p.shortName,
        fullName: p.fullName,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.bank.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.bank.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy ngân hàng ${id}`)
    await this.prisma.bank.delete({ where: { id } })
    return { id }
  }

  private async ensureShortNameFree(shortName: string) {
    const dup = await this.prisma.bank.findUnique({ where: { shortName } })
    if (dup) throw new ConflictException(`Tên viết tắt "${shortName}" đã tồn tại`)
  }
}

function toBankDto(b: Bank) {
  return {
    id: b.id,
    shortName: b.shortName,
    fullName: b.fullName,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}
