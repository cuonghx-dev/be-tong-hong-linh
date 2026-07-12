import { Injectable } from '@nestjs/common'
import { PartnerType, Prisma, type AccountOpeningBalance } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseAccountBalanceXlsx } from './account-balance-import'
import { SaveAccountBalancesDto } from './dto/save-account-balances.dto'
import { SaveBankAccountBalancesDto } from './dto/save-bank-account-balances.dto'
import { SavePartnerBalancesDto } from './dto/save-partner-balances.dto'

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

  // ── Số dư công nợ chi tiết theo đối tượng (131 theo KH, 331 theo NCC…) ──────

  // Loại đối tượng theo TK công nợ: 331x → nhà cung cấp, còn lại (131x) → khách hàng.
  private partnerTypeFor(accountCode: string): PartnerType {
    return accountCode.startsWith('331') ? PartnerType.SUPPLIER : PartnerType.CUSTOMER
  }

  // Danh sách đối tượng (KH/NCC) theo loại TK — chuẩn hóa {id, code, name}.
  private listPartners(partnerType: PartnerType) {
    const args = {
      orderBy: { code: 'asc' as const },
      select: { id: true, code: true, name: true },
    }
    return partnerType === PartnerType.SUPPLIER
      ? this.prisma.supplier.findMany(args)
      : this.prisma.customer.findMany(args)
  }

  // Danh sách công nợ của 1 TK: mọi đối tượng + số dư (0 nếu chưa nhập).
  async listPartnerBalances(accountCode: string) {
    const code = accountCode.trim()
    const partnerType = this.partnerTypeFor(code)
    const [account, partners, balances] = await Promise.all([
      this.prisma.accountOpeningBalance.findUnique({ where: { accountCode: code } }),
      this.listPartners(partnerType),
      this.prisma.partnerOpeningBalance.findMany({ where: { accountCode: code, partnerType } }),
    ])
    const byPartner = new Map(balances.map((b) => [b.partnerId, b]))
    return {
      accountCode: code,
      accountName: account?.accountName ?? '',
      partnerType,
      items: partners.map((p) => {
        const b = byPartner.get(p.id)
        return {
          partnerId: p.id,
          partnerCode: p.code,
          partnerName: p.name,
          debitAmount: (b?.debitAmount ?? new Prisma.Decimal(0)).toString(),
          creditAmount: (b?.creditAmount ?? new Prisma.Decimal(0)).toString(),
        }
      }),
    }
  }

  // Lưu số dư công nợ của 1 TK: thay thế dữ liệu cũ của TK đó, rồi cập nhật số dư
  // của chính TK công nợ trong bảng số dư tài khoản = tổng cộng các dòng chi tiết.
  async savePartnerBalances(dto: SavePartnerBalancesDto) {
    const accountCode = dto.accountCode.trim()
    const partnerType = this.partnerTypeFor(accountCode)

    // Trùng đối tượng trong payload → giữ dòng cuối. Bỏ dòng số dư 0 cả 2 vế.
    const byPartner = new Map(
      dto.items.map((item) => [
        item.partnerId,
        {
          accountCode,
          partnerType,
          partnerId: item.partnerId,
          debitAmount: new Prisma.Decimal(item.debitAmount),
          creditAmount: new Prisma.Decimal(item.creditAmount),
        },
      ]),
    )
    const rows = [...byPartner.values()].filter(
      (r) => !r.debitAmount.isZero() || !r.creditAmount.isZero(),
    )

    const totalDebit = rows.reduce((s, r) => s.add(r.debitAmount), new Prisma.Decimal(0))
    const totalCredit = rows.reduce((s, r) => s.add(r.creditAmount), new Prisma.Decimal(0))

    await this.prisma.$transaction(async (tx) => {
      await tx.partnerOpeningBalance.deleteMany({ where: { accountCode, partnerType } })
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.partnerOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      // Đồng bộ số dư TK công nợ = tổng chi tiết (chỉ khi TK đã tồn tại trong bảng số dư).
      await tx.accountOpeningBalance.updateMany({
        where: { accountCode },
        data: { debitAmount: totalDebit, creditAmount: totalCredit },
      })
    })

    return this.listPartnerBalances(accountCode)
  }

  // ── Số dư tiền gửi chi tiết theo tài khoản ngân hàng (1121 theo từng TK NH…) ──

  // Danh sách tiền gửi của 1 TK: mọi tài khoản ngân hàng + số dư (0 nếu chưa nhập).
  async listBankAccountBalances(accountCode: string) {
    const code = accountCode.trim()
    const [account, bankAccounts, balances] = await Promise.all([
      this.prisma.accountOpeningBalance.findUnique({ where: { accountCode: code } }),
      this.prisma.bankAccount.findMany({
        orderBy: { accountNumber: 'asc' },
        select: { id: true, accountNumber: true, bankName: true },
      }),
      this.prisma.bankAccountOpeningBalance.findMany({ where: { accountCode: code } }),
    ])
    const byBankAccount = new Map(balances.map((b) => [b.bankAccountId, b]))
    return {
      accountCode: code,
      accountName: account?.accountName ?? '',
      items: bankAccounts.map((a) => {
        const b = byBankAccount.get(a.id)
        return {
          bankAccountId: a.id,
          accountNumber: a.accountNumber,
          bankName: a.bankName,
          debitAmount: (b?.debitAmount ?? new Prisma.Decimal(0)).toString(),
          creditAmount: (b?.creditAmount ?? new Prisma.Decimal(0)).toString(),
        }
      }),
    }
  }

  // Lưu số dư tiền gửi của 1 TK: thay thế dữ liệu cũ của TK đó, rồi cập nhật số dư
  // của chính TK tiền gửi trong bảng số dư tài khoản = tổng cộng các dòng chi tiết.
  async saveBankAccountBalances(dto: SaveBankAccountBalancesDto) {
    const accountCode = dto.accountCode.trim()

    // Trùng TK NH trong payload → giữ dòng cuối. Bỏ dòng số dư 0 cả 2 vế.
    const byBankAccount = new Map(
      dto.items.map((item) => [
        item.bankAccountId,
        {
          accountCode,
          bankAccountId: item.bankAccountId,
          debitAmount: new Prisma.Decimal(item.debitAmount),
          creditAmount: new Prisma.Decimal(item.creditAmount),
        },
      ]),
    )
    const rows = [...byBankAccount.values()].filter(
      (r) => !r.debitAmount.isZero() || !r.creditAmount.isZero(),
    )

    const totalDebit = rows.reduce((s, r) => s.add(r.debitAmount), new Prisma.Decimal(0))
    const totalCredit = rows.reduce((s, r) => s.add(r.creditAmount), new Prisma.Decimal(0))

    await this.prisma.$transaction(async (tx) => {
      await tx.bankAccountOpeningBalance.deleteMany({ where: { accountCode } })
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.bankAccountOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      // Đồng bộ số dư TK tiền gửi = tổng chi tiết (chỉ khi TK đã tồn tại trong bảng số dư).
      await tx.accountOpeningBalance.updateMany({
        where: { accountCode },
        data: { debitAmount: totalDebit, creditAmount: totalCredit },
      })
    })

    return this.listBankAccountBalances(accountCode)
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
