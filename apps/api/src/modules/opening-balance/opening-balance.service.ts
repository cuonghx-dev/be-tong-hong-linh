import { Injectable } from '@nestjs/common'
import { Prisma, type AccountOpeningBalance } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseAccountBalanceXlsx } from './account-balance-import'
import { SaveAccountBalancesDto } from './dto/save-account-balances.dto'

@Injectable()
export class OpeningBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  // Danh sách số dư tài khoản, sắp theo số TK (cha đứng trước con vì cùng prefix).
  async listAccountBalances() {
    const rows = await this.prisma.accountOpeningBalance.findMany({
      orderBy: { accountCode: 'asc' },
    })
    return rows.map(toAccountBalanceDto)
  }

  // Lưu cả bảng: thay thế toàn bộ dữ liệu cũ (như update line chứng từ — xóa hết tạo lại).
  async saveAccountBalances(dto: SaveAccountBalancesDto) {
    // Trùng số TK trong payload → giữ dòng cuối (người dùng sửa sau cùng).
    const byCode = new Map(
      dto.items.map((item) => [
        item.accountCode.trim(),
        {
          accountCode: item.accountCode.trim(),
          accountName: item.accountName.trim(),
          debitAmount: new Prisma.Decimal(item.debitAmount),
          creditAmount: new Prisma.Decimal(item.creditAmount),
        },
      ]),
    )
    const items = [...byCode.values()]

    await this.prisma.$transaction(async (tx) => {
      await tx.accountOpeningBalance.deleteMany({})
      const chunk = 500
      for (let i = 0; i < items.length; i += chunk) {
        await tx.accountOpeningBalance.createMany({ data: items.slice(i, i + chunk) })
      }
    })
    return this.listAccountBalances()
  }

  // Nhập khẩu từ file Excel — bỏ qua dòng trùng số TK đã có.
  async importAccountBalancesXlsx(buffer: Buffer) {
    const parsed = parseAccountBalanceXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const existing = await this.prisma.accountOpeningBalance.findMany({
      select: { accountCode: true },
    })
    const seen = new Set(existing.map((e) => e.accountCode))

    const rows: Prisma.AccountOpeningBalanceCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.accountCode)) continue
      seen.add(p.accountCode) // chống trùng trong chính file
      rows.push({
        accountCode: p.accountCode,
        accountName: p.accountName,
        debitAmount: new Prisma.Decimal(p.debitAmount),
        creditAmount: new Prisma.Decimal(p.creditAmount),
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < rows.length; i += chunk) {
      await this.prisma.accountOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: rows.length, skipped: parsed.length - rows.length }
  }
}

function toAccountBalanceDto(r: AccountOpeningBalance) {
  return {
    id: r.id,
    accountCode: r.accountCode,
    accountName: r.accountName,
    debitAmount: r.debitAmount.toString(),
    creditAmount: r.creditAmount.toString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
