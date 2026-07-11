import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type TransferAccount } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateTransferAccountDto } from './dto/create-transfer-account.dto'
import { TransferAccountFilterDto } from './dto/transfer-account-filter.dto'
import { UpdateTransferAccountDto } from './dto/update-transfer-account.dto'
import { parseTransferAccountXlsx } from './transfer-account-import'

@Injectable()
export class TransferAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: TransferAccountFilterDto,
  ): Promise<Paginated<ReturnType<typeof toTransferAccountDto>>> {
    const where: Prisma.TransferAccountWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.side) where.side = filter.side
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { fromAccount: { contains: filter.keyword, mode: 'insensitive' } },
        { toAccount: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.transferAccount.findMany({
        where,
        orderBy: [{ order: 'asc' }, { code: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.transferAccount.count({ where }),
    ])

    return {
      data: rows.map(toTransferAccountDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const row = await this.prisma.transferAccount.findUnique({ where: { id } })
    if (!row) throw new NotFoundException(`Không tìm thấy tài khoản kết chuyển ${id}`)
    return toTransferAccountDto(row)
  }

  async create(dto: CreateTransferAccountDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.transferAccount.create({
      data: {
        order: dto.order,
        code: dto.code,
        fromAccount: dto.fromAccount,
        toAccount: dto.toAccount,
        side: dto.side ?? undefined,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toTransferAccountDto(created)
  }

  async update(id: string, dto: UpdateTransferAccountDto) {
    const existing = await this.prisma.transferAccount.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài khoản kết chuyển ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.transferAccount.update({
      where: { id },
      data: {
        order: dto.order ?? undefined,
        code: dto.code ?? undefined,
        fromAccount: dto.fromAccount ?? undefined,
        toAccount: dto.toAccount ?? undefined,
        side: dto.side ?? undefined,
        description: dto.description === undefined ? undefined : dto.description,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toTransferAccountDto(updated)
  }

  // Nhập khẩu tài khoản kết chuyển từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseTransferAccountXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.transferAccount.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.TransferAccountCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        order: p.order,
        code: p.code,
        fromAccount: p.fromAccount,
        toAccount: p.toAccount,
        side: p.side,
        description: p.description,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.transferAccount.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.transferAccount.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài khoản kết chuyển ${id}`)
    await this.prisma.transferAccount.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.transferAccount.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã kết chuyển "${code}" đã tồn tại`)
  }
}

function toTransferAccountDto(t: TransferAccount) {
  return {
    id: t.id,
    order: t.order,
    code: t.code,
    fromAccount: t.fromAccount,
    toAccount: t.toAccount,
    side: t.side,
    description: t.description,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
