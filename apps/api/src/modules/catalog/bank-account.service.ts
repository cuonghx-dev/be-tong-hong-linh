import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type BankAccount } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseBankAccountXlsx } from './bank-account-import'
import { BankAccountFilterDto } from './dto/bank-account-filter.dto'
import { CreateBankAccountDto } from './dto/create-bank-account.dto'
import { UpdateBankAccountDto } from './dto/update-bank-account.dto'

@Injectable()
export class BankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: BankAccountFilterDto): Promise<Paginated<ReturnType<typeof toBankAccountDto>>> {
    const where: Prisma.BankAccountWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { accountNumber: { contains: filter.keyword, mode: 'insensitive' } },
        { bankName: { contains: filter.keyword, mode: 'insensitive' } },
        { accountHolder: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bankAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.bankAccount.count({ where }),
    ])

    return {
      data: rows.map(toBankAccountDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException(`Không tìm thấy tài khoản ngân hàng ${id}`)
    return toBankAccountDto(account)
  }

  async create(dto: CreateBankAccountDto) {
    await this.ensureAccountNumberFree(dto.accountNumber)
    const created = await this.prisma.bankAccount.create({
      data: {
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        bankId: await this.resolveBankId(dto.bankName),
        bankBranch: dto.bankBranch ?? null,
        accountHolder: dto.accountHolder ?? null,
        branch: dto.branch ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toBankAccountDto(created)
  }

  async update(id: string, dto: UpdateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài khoản ngân hàng ${id}`)
    if (dto.accountNumber && dto.accountNumber !== existing.accountNumber) {
      await this.ensureAccountNumberFree(dto.accountNumber)
    }

    const updated = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        accountNumber: dto.accountNumber ?? undefined,
        bankName: dto.bankName ?? undefined,
        // Đổi tên ngân hàng → gắn lại bankId theo danh mục Bank.
        bankId: dto.bankName ? await this.resolveBankId(dto.bankName) : undefined,
        bankBranch: dto.bankBranch ?? undefined,
        accountHolder: dto.accountHolder ?? undefined,
        branch: dto.branch ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toBankAccountDto(updated)
  }

  // Nhập khẩu tài khoản ngân hàng từ Excel. Bỏ qua số TK đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseBankAccountXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const numbers = parsed.map((p) => p.accountNumber)
    const existing = await this.prisma.bankAccount.findMany({
      where: { accountNumber: { in: numbers } },
      select: { accountNumber: true },
    })
    const seen = new Set(existing.map((e) => e.accountNumber))

    // Map tên ngân hàng → id danh mục Bank (khớp short_name hoặc full_name) để gắn bankId.
    const banks = await this.prisma.bank.findMany({ select: { id: true, shortName: true, fullName: true } })
    const bankByName = new Map<string, string>()
    for (const b of banks) {
      bankByName.set(b.shortName, b.id)
      bankByName.set(b.fullName, b.id)
    }

    const data: Prisma.BankAccountCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.accountNumber)) continue
      seen.add(p.accountNumber)
      data.push({
        accountNumber: p.accountNumber,
        bankName: p.bankName,
        bankId: bankByName.get(p.bankName) ?? null,
        bankBranch: p.bankBranch,
        accountHolder: p.accountHolder,
        branch: p.branch,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.bankAccount.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.bankAccount.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài khoản ngân hàng ${id}`)
    await this.prisma.bankAccount.delete({ where: { id } })
    return { id }
  }

  private async ensureAccountNumberFree(accountNumber: string) {
    const dup = await this.prisma.bankAccount.findUnique({ where: { accountNumber } })
    if (dup) throw new ConflictException(`Số tài khoản "${accountNumber}" đã tồn tại`)
  }

  // Khớp tên ngân hàng với danh mục Bank (short_name hoặc full_name); không khớp → null.
  private async resolveBankId(bankName: string): Promise<string | null> {
    const bank = await this.prisma.bank.findFirst({
      where: { OR: [{ shortName: bankName }, { fullName: bankName }] },
      select: { id: true },
    })
    return bank?.id ?? null
  }
}

function toBankAccountDto(a: BankAccount) {
  return {
    id: a.id,
    accountNumber: a.accountNumber,
    bankId: a.bankId,
    bankName: a.bankName,
    bankBranch: a.bankBranch,
    accountHolder: a.accountHolder,
    branch: a.branch,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}
