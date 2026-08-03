import { BadRequestException, Injectable } from '@nestjs/common'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import { BookLockService } from '../book-lock/book-lock.service'
import {
  PartnerType,
  Prisma,
  ProductType,
  type AccountOpeningBalance,
  type FixedAssetOpeningBalance,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseAccountBalanceXlsx } from './account-balance-import'
import { parseBankAccountBalanceXlsx } from './bank-account-balance-import'
import { parseFixedAssetXlsx } from './fixed-asset-import'
import { parseInventoryBalanceXlsx } from './inventory-balance-import'
import { parsePartnerBalanceXlsx } from './partner-balance-import'
import { SaveAccountBalancesDto } from './dto/save-account-balances.dto'
import { SaveBankAccountBalancesDto } from './dto/save-bank-account-balances.dto'
import {
  SaveFixedAssetBalanceLineDto,
  SaveFixedAssetBalancesDto,
} from './dto/save-fixed-asset-balances.dto'
import { SaveInventoryBalancesDto } from './dto/save-inventory-balances.dto'
import { SavePartnerBalancesDto } from './dto/save-partner-balances.dto'

@Injectable()
export class OpeningBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  // Số dư đầu kỳ là dữ liệu gốc của cả sổ sách: đã khóa sổ thì không cho sửa/nhập
  // (mọi thay đổi sẽ làm lệch báo cáo của kỳ đã khóa).
  private async assertBookUnlocked() {
    const lockDate = await this.bookLock.getLockDate()
    if (lockDate) {
      throw new BadRequestException(
        `Đã khóa sổ đến ${lockDate.toISOString().slice(0, 10)} — bỏ khóa sổ trước khi sửa số dư đầu kỳ`,
      )
    }
  }

  // Danh sách số dư tài khoản, sắp theo số TK (cha đứng trước con vì cùng prefix).
  async listAccountBalances() {
    const rows = await this.prisma.accountOpeningBalance.findMany({
      orderBy: { accountCode: 'asc' },
    })
    return rows.map(toAccountBalanceDto)
  }

  // Lưu cả bảng: thay thế toàn bộ dữ liệu cũ (như update line chứng từ — xóa hết tạo lại).
  async saveAccountBalances(dto: SaveAccountBalancesDto) {
    await this.assertBookUnlocked()
    // 1 TK chỉ dư 1 vế — vừa Nợ vừa Có là nhập sai (các bảng công nợ/tiền gửi cùng luật).
    for (const item of dto.items) {
      if (item.debitAmount > 0 && item.creditAmount > 0)
        throw new BadRequestException(
          `TK ${item.accountCode}: chỉ được nhập 1 vế Dư Nợ hoặc Dư Có`,
        )
    }
    // Trùng số TK trong payload → giữ dòng cuối (người dùng sửa sau cùng).
    // Dòng 0/0 bỏ qua như các bảng số dư khác (công nợ/tiền gửi/tồn kho).
    const byCode = new Map(
      dto.items
        .filter((item) => item.debitAmount > 0 || item.creditAmount > 0)
        .map((item) => [
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
    await this.assertBookUnlocked()
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
    await this.assertBookUnlocked()
    const accountCode = dto.accountCode.trim()
    const partnerType = this.partnerTypeFor(accountCode)
    // 1 đối tượng chỉ dư 1 vế (như bảng số dư tài khoản).
    for (const item of dto.items) {
      if (item.debitAmount > 0 && item.creditAmount > 0)
        throw new BadRequestException(
          `Đối tượng ${item.partnerId}: chỉ được nhập 1 vế Dư Nợ hoặc Dư Có`,
        )
    }

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

  // Nhập khẩu số dư công nợ của 1 TK từ file Excel MISA (Danh_sach_cong_no_khach_hang.xlsx…).
  // Bỏ qua mã không có trong danh mục và đối tượng đã có số dư của TK này (như import số dư TK).
  async importPartnerBalancesXlsx(accountCode: string, buffer: Buffer) {
    await this.assertBookUnlocked()
    const code = accountCode.trim()
    const partnerType = this.partnerTypeFor(code)
    const parsed = parsePartnerBalanceXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const [partners, existing] = await Promise.all([
      this.listPartners(partnerType),
      this.prisma.partnerOpeningBalance.findMany({
        where: { accountCode: code, partnerType },
        select: { partnerId: true },
      }),
    ])
    const idByCode = new Map(partners.map((p) => [p.code, p.id]))
    const seen = new Set(existing.map((e) => e.partnerId))

    const rows: Prisma.PartnerOpeningBalanceCreateManyInput[] = []
    for (const p of parsed) {
      const partnerId = idByCode.get(p.partnerCode)
      if (!partnerId || seen.has(partnerId)) continue
      if (p.debit !== undefined || p.credit !== undefined) {
        // File tách cột Dư Nợ/Dư Có: ghi thẳng 2 vế theo file.
        const debit = Math.abs(p.debit ?? 0)
        const credit = Math.abs(p.credit ?? 0)
        if (debit === 0 && credit === 0) continue
        seen.add(partnerId) // chống trùng trong chính file
        rows.push({
          accountCode: code,
          partnerType,
          partnerId,
          debitAmount: new Prisma.Decimal(debit),
          creditAmount: new Prisma.Decimal(credit),
        })
        continue
      }
      if (p.amount === 0) continue
      seen.add(partnerId) // chống trùng trong chính file
      // Số dương: 131 còn phải thu → Dư Nợ, 331 còn phải trả → Dư Có. Số âm đảo vế
      // (KH trả trước → 131 Dư Có, trả thừa NCC → 331 Dư Nợ).
      const positiveIsDebit = partnerType === PartnerType.CUSTOMER
      const isDebit = positiveIsDebit === p.amount > 0
      const amount = new Prisma.Decimal(p.amount).abs()
      rows.push({
        accountCode: code,
        partnerType,
        partnerId,
        debitAmount: isDebit ? amount : new Prisma.Decimal(0),
        creditAmount: isDebit ? new Prisma.Decimal(0) : amount,
      })
    }

    await this.prisma.$transaction(async (tx) => {
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.partnerOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      // Đồng bộ số dư TK công nợ = tổng chi tiết sau nhập (gồm cả dòng đã có trước đó).
      const all = await tx.partnerOpeningBalance.findMany({
        where: { accountCode: code, partnerType },
        select: { debitAmount: true, creditAmount: true },
      })
      const totalDebit = all.reduce((s, r) => s.add(r.debitAmount), new Prisma.Decimal(0))
      const totalCredit = all.reduce((s, r) => s.add(r.creditAmount), new Prisma.Decimal(0))
      await tx.accountOpeningBalance.updateMany({
        where: { accountCode: code },
        data: { debitAmount: totalDebit, creditAmount: totalCredit },
      })
    })

    return { total: parsed.length, created: rows.length, skipped: parsed.length - rows.length }
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
    await this.assertBookUnlocked()
    const accountCode = dto.accountCode.trim()

    // 1 TK ngân hàng chỉ dư 1 vế (như bảng số dư tài khoản).
    for (const item of dto.items) {
      if (item.debitAmount > 0 && item.creditAmount > 0)
        throw new BadRequestException(
          `TK ngân hàng ${item.bankAccountId}: chỉ được nhập 1 vế Dư Nợ hoặc Dư Có`,
        )
    }
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

  // Nhập khẩu số dư tiền gửi của 1 TK từ file Excel (bỏ qua số TK không có trong danh mục
  // và TK ngân hàng đã có số dư của TK này — như import số dư công nợ).
  async importBankAccountBalancesXlsx(accountCode: string, buffer: Buffer) {
    await this.assertBookUnlocked()
    const code = accountCode.trim()
    const parsed = parseBankAccountBalanceXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const [bankAccounts, existing] = await Promise.all([
      this.prisma.bankAccount.findMany({ select: { id: true, accountNumber: true } }),
      this.prisma.bankAccountOpeningBalance.findMany({
        where: { accountCode: code },
        select: { bankAccountId: true },
      }),
    ])
    const idByNumber = new Map(bankAccounts.map((a) => [a.accountNumber, a.id]))
    const seen = new Set(existing.map((e) => e.bankAccountId))

    const rows: Prisma.BankAccountOpeningBalanceCreateManyInput[] = []
    for (const p of parsed) {
      const bankAccountId = idByNumber.get(p.accountNumber)
      const debit = Math.abs(p.debit)
      const credit = Math.abs(p.credit)
      if (!bankAccountId || seen.has(bankAccountId) || (debit === 0 && credit === 0)) continue
      seen.add(bankAccountId) // chống trùng trong chính file
      rows.push({
        accountCode: code,
        bankAccountId,
        debitAmount: new Prisma.Decimal(debit),
        creditAmount: new Prisma.Decimal(credit),
      })
    }

    await this.prisma.$transaction(async (tx) => {
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.bankAccountOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      // Đồng bộ số dư TK tiền gửi = tổng chi tiết sau nhập (gồm cả dòng đã có trước đó).
      const all = await tx.bankAccountOpeningBalance.findMany({
        where: { accountCode: code },
        select: { debitAmount: true, creditAmount: true },
      })
      const totalDebit = all.reduce((s, r) => s.add(r.debitAmount), new Prisma.Decimal(0))
      const totalCredit = all.reduce((s, r) => s.add(r.creditAmount), new Prisma.Decimal(0))
      await tx.accountOpeningBalance.updateMany({
        where: { accountCode: code },
        data: { debitAmount: totalDebit, creditAmount: totalCredit },
      })
    })

    return { total: parsed.length, created: rows.length, skipped: parsed.length - rows.length }
  }

  // ── Tài sản cố định đầu kỳ (Danh_sach_tai_san_co_dinh_dau_ky.xlsx) ──────────

  // Danh sách TSCĐ đầu kỳ, sắp theo mã tài sản.
  async listFixedAssetBalances() {
    const rows = await this.prisma.fixedAssetOpeningBalance.findMany({
      orderBy: { code: 'asc' },
    })
    return rows.map(toFixedAssetBalanceDto)
  }

  // Lưu cả danh sách: thay thế toàn bộ dữ liệu cũ (như bảng số dư tài khoản), rồi đồng bộ
  // số dư TK nguyên giá (Dư Nợ) / TK khấu hao (Dư Có) trong bảng số dư tài khoản.
  async saveFixedAssetBalances(dto: SaveFixedAssetBalancesDto) {
    await this.assertBookUnlocked()
    // Ràng buộc nhất quán: TSCĐ phải có nguyên giá > 0, hao mòn không vượt nguyên giá.
    for (const item of dto.items) {
      if (item.originalCost <= 0)
        throw new BadRequestException(`Tài sản ${item.code}: nguyên giá phải > 0`)
      if (item.accumulatedDepreciation > item.originalCost)
        throw new BadRequestException(
          `Tài sản ${item.code}: hao mòn lũy kế không được vượt nguyên giá`,
        )
    }
    // Trùng mã tài sản trong payload → giữ dòng cuối (người dùng sửa sau cùng).
    const byCode = new Map(
      dto.items.map((item) => [item.code.trim(), toFixedAssetCreateInput(item)]),
    )
    const items = [...byCode.values()]

    await this.prisma.$transaction(async (tx) => {
      // Nhớ các TK từng bị ảnh hưởng để reset về 0 nếu không còn tài sản nào dùng.
      const old = await tx.fixedAssetOpeningBalance.findMany({
        select: { assetAccount: true, depreciationAccount: true },
      })
      await tx.fixedAssetOpeningBalance.deleteMany({})
      const chunk = 500
      for (let i = 0; i < items.length; i += chunk) {
        await tx.fixedAssetOpeningBalance.createMany({ data: items.slice(i, i + chunk) })
      }
      await syncFixedAssetAccountBalances(tx, items, old)
    })
    return this.listFixedAssetBalances()
  }

  // Nhập khẩu từ file Excel — bỏ qua dòng trùng mã tài sản đã có, rồi đồng bộ số dư TK.
  async importFixedAssetBalancesXlsx(buffer: Buffer) {
    await this.assertBookUnlocked()
    const parsed = parseFixedAssetXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const existing = await this.prisma.fixedAssetOpeningBalance.findMany({
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const rows: Prisma.FixedAssetOpeningBalanceCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code) // chống trùng trong chính file
      rows.push({
        code: p.code,
        name: p.name,
        assetType: p.assetType,
        department: p.department,
        originalCost: new Prisma.Decimal(p.originalCost),
        depreciableValue: new Prisma.Decimal(p.depreciableValue),
        accumulatedDepreciation: new Prisma.Decimal(p.accumulatedDepreciation),
        acquisitionDate: p.acquisitionDate,
        depreciationDate: p.depreciationDate,
        usefulLifeMonths: new Prisma.Decimal(p.usefulLifeMonths),
        remainingMonths: new Prisma.Decimal(p.remainingMonths),
        assetAccount: p.assetAccount,
        depreciationAccount: p.depreciationAccount,
      })
    }

    await this.prisma.$transaction(async (tx) => {
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.fixedAssetOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      // Đồng bộ số dư TK = tổng toàn bộ tài sản sau nhập (gồm cả dòng đã có trước đó).
      const all = await tx.fixedAssetOpeningBalance.findMany({
        select: {
          originalCost: true,
          accumulatedDepreciation: true,
          assetAccount: true,
          depreciationAccount: true,
        },
      })
      await syncFixedAssetAccountBalances(tx, all, [])
    })

    return { total: parsed.length, created: rows.length, skipped: parsed.length - rows.length }
  }

  // ── Tồn kho đầu kỳ vật tư, hàng hóa, CCDC (Danh_sach_ton_kho_vthh.xlsx) ─────

  // VTHH có theo dõi tồn kho (mọi tính chất trừ dịch vụ), sắp theo mã hàng.
  private listStockableProducts() {
    return this.prisma.product.findMany({
      where: { type: { not: ProductType.SERVICE } },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        groupCode: true,
        unit: true,
        defaultWarehouseCode: true,
        inventoryAccount: true,
      },
    })
  }

  // TK kho của 1 VTHH: ưu tiên TK Kho khai trong danh mục, thiếu thì suy từ tính chất.
  private inventoryAccountFor(p: { inventoryAccount: string | null; type: ProductType }) {
    const declared = p.inventoryAccount?.trim()
    if (declared) return declared
    switch (p.type) {
      case ProductType.MATERIAL:
        return CHART_OF_ACCOUNTS.MATERIAL // 152
      case ProductType.TOOL:
        return CHART_OF_ACCOUNTS.TOOL // 153
      case ProductType.FINISHED:
        return CHART_OF_ACCOUNTS.FINISHED_GOODS // 155
      default:
        return CHART_OF_ACCOUNTS.GOODS // 156
    }
  }

  // Danh sách tồn kho đầu kỳ: mọi VTHH + số tồn (0 nếu chưa nhập; VTHH tồn ở nhiều kho
  // → mỗi kho 1 dòng). Kèm danh mục kho cho ô chọn Mã kho khi sửa.
  async listInventoryBalances() {
    const [products, balances, warehouses] = await Promise.all([
      this.listStockableProducts(),
      this.prisma.inventoryOpeningBalance.findMany({ orderBy: { warehouseCode: 'asc' } }),
      this.prisma.warehouse.findMany({
        orderBy: { code: 'asc' },
        select: { code: true, name: true },
      }),
    ])
    const byProduct = new Map<string, typeof balances>()
    for (const b of balances) {
      const list = byProduct.get(b.productId) ?? []
      list.push(b)
      byProduct.set(b.productId, list)
    }
    const items = products.flatMap((p) => {
      const base = {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        groupCode: p.groupCode ?? '',
        unit: p.unit ?? '',
      }
      const rows = byProduct.get(p.id)
      if (!rows?.length)
        return [
          { ...base, warehouseCode: p.defaultWarehouseCode ?? '', quantity: '0', amount: '0' },
        ]
      return rows.map((b) => ({
        ...base,
        warehouseCode: b.warehouseCode,
        quantity: b.quantity.toString(),
        amount: b.amount.toString(),
      }))
    })
    return { items, warehouses }
  }

  // Lưu cả bảng tồn kho: thay thế toàn bộ dữ liệu cũ, rồi đồng bộ số dư TK kho
  // (152/153/155/156… Dư Nợ) trong bảng số dư tài khoản = tổng Giá trị tồn theo TK.
  async saveInventoryBalances(dto: SaveInventoryBalancesDto) {
    await this.assertBookUnlocked()
    // Trùng VTHH+kho trong payload → giữ dòng cuối. Bỏ dòng 0 cả số lượng lẫn giá trị.
    const byKey = new Map(
      dto.items.map((item) => [
        `${item.productId}|${item.warehouseCode.trim()}`,
        {
          productId: item.productId,
          warehouseCode: item.warehouseCode.trim(),
          quantity: new Prisma.Decimal(item.quantity),
          amount: new Prisma.Decimal(item.amount),
        },
      ]),
    )
    const rows = [...byKey.values()].filter((r) => !r.quantity.isZero() || !r.amount.isZero())

    await this.prisma.$transaction(async (tx) => {
      // Nhớ các VTHH từng có tồn để reset TK kho về 0 nếu không còn dòng nào dùng.
      const old = await tx.inventoryOpeningBalance.findMany({ select: { productId: true } })
      await tx.inventoryOpeningBalance.deleteMany({})
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.inventoryOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      await this.syncInventoryAccountBalances(
        tx,
        rows,
        old.map((o) => o.productId),
      )
    })
    return this.listInventoryBalances()
  }

  // Nhập khẩu tồn kho từ file Excel MISA — bỏ qua mã hàng không có trong danh mục và
  // VTHH+kho đã có số tồn, rồi đồng bộ số dư TK kho.
  async importInventoryBalancesXlsx(buffer: Buffer) {
    await this.assertBookUnlocked()
    const parsed = parseInventoryBalanceXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const [products, existing] = await Promise.all([
      this.listStockableProducts(),
      this.prisma.inventoryOpeningBalance.findMany({
        select: { productId: true, warehouseCode: true },
      }),
    ])
    const productByCode = new Map(products.map((p) => [p.code, p]))
    const seen = new Set(existing.map((e) => `${e.productId}|${e.warehouseCode}`))

    const rows: Prisma.InventoryOpeningBalanceCreateManyInput[] = []
    for (const p of parsed) {
      const product = productByCode.get(p.productCode)
      if (!product || (p.quantity === 0 && p.amount === 0)) continue
      const warehouseCode = p.warehouseCode || product.defaultWarehouseCode || ''
      const key = `${product.id}|${warehouseCode}`
      if (seen.has(key)) continue
      seen.add(key) // chống trùng trong chính file
      rows.push({
        productId: product.id,
        warehouseCode,
        quantity: new Prisma.Decimal(p.quantity),
        amount: new Prisma.Decimal(p.amount),
      })
    }

    await this.prisma.$transaction(async (tx) => {
      const chunk = 500
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.inventoryOpeningBalance.createMany({ data: rows.slice(i, i + chunk) })
      }
      // Đồng bộ số dư TK kho = tổng toàn bộ dòng tồn sau nhập (gồm cả dòng đã có trước đó).
      const all = await tx.inventoryOpeningBalance.findMany({
        select: { productId: true, amount: true },
      })
      await this.syncInventoryAccountBalances(tx, all, [])
    })

    return { total: parsed.length, created: rows.length, skipped: parsed.length - rows.length }
  }

  // Đồng bộ số dư TK kho trong bảng số dư tài khoản: Dư Nợ = tổng Giá trị tồn nhóm theo
  // TK kho của từng VTHH. TK cũ không còn dòng tồn nào → reset về 0. Chỉ cập nhật TK đã
  // tồn tại trong bảng số dư (updateMany — như công nợ/tiền gửi/TSCĐ).
  private async syncInventoryAccountBalances(
    tx: Prisma.TransactionClient,
    rows: { productId: string; amount: Prisma.Decimal }[],
    oldProductIds: string[],
  ) {
    const ids = [...new Set([...rows.map((r) => r.productId), ...oldProductIds])]
    if (ids.length === 0) return
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, type: true, inventoryAccount: true },
    })
    const accountById = new Map(products.map((p) => [p.id, this.inventoryAccountFor(p)]))

    const zero = new Prisma.Decimal(0)
    const totals = new Map<string, Prisma.Decimal>()
    for (const id of oldProductIds) {
      const code = accountById.get(id)
      if (code && !totals.has(code)) totals.set(code, zero)
    }
    for (const r of rows) {
      const code = accountById.get(r.productId)
      if (!code) continue
      totals.set(code, (totals.get(code) ?? zero).add(r.amount))
    }
    for (const [accountCode, debit] of totals) {
      await tx.accountOpeningBalance.updateMany({
        where: { accountCode },
        data: { debitAmount: debit, creditAmount: zero },
      })
    }
  }
}

// Dòng tối thiểu để tính tổng theo TK nguyên giá/khấu hao.
interface FixedAssetAccountAmounts {
  assetAccount: string
  depreciationAccount: string
  originalCost: Prisma.Decimal
  accumulatedDepreciation: Prisma.Decimal
}

// Đồng bộ số dư TK trong bảng số dư tài khoản: TK nguyên giá (211x) Dư Nợ = tổng nguyên giá,
// TK khấu hao (214x) Dư Có = tổng hao mòn lũy kế. TK cũ không còn tài sản nào → reset về 0.
// Chỉ cập nhật TK đã tồn tại trong bảng số dư (updateMany — như công nợ/tiền gửi).
async function syncFixedAssetAccountBalances(
  tx: Prisma.TransactionClient,
  rows: FixedAssetAccountAmounts[],
  oldRows: { assetAccount: string; depreciationAccount: string }[],
) {
  const zero = new Prisma.Decimal(0)
  const totals = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()
  const ensure = (code: string) => {
    let t = totals.get(code)
    if (!t) {
      t = { debit: zero, credit: zero }
      totals.set(code, t)
    }
    return t
  }
  for (const r of oldRows) {
    ensure(r.assetAccount)
    ensure(r.depreciationAccount)
  }
  for (const r of rows) {
    const asset = ensure(r.assetAccount)
    asset.debit = asset.debit.add(r.originalCost)
    const dep = ensure(r.depreciationAccount)
    dep.credit = dep.credit.add(r.accumulatedDepreciation)
  }
  for (const [accountCode, t] of totals) {
    await tx.accountOpeningBalance.updateMany({
      where: { accountCode },
      data: { debitAmount: t.debit, creditAmount: t.credit },
    })
  }
}

function toFixedAssetCreateInput(
  item: SaveFixedAssetBalanceLineDto,
): Prisma.FixedAssetOpeningBalanceCreateManyInput & FixedAssetAccountAmounts {
  return {
    code: item.code.trim(),
    name: item.name.trim(),
    assetType: item.assetType.trim(),
    department: item.department.trim(),
    originalCost: new Prisma.Decimal(item.originalCost),
    depreciableValue: new Prisma.Decimal(item.depreciableValue),
    accumulatedDepreciation: new Prisma.Decimal(item.accumulatedDepreciation),
    acquisitionDate: new Date(item.acquisitionDate),
    depreciationDate: new Date(item.depreciationDate),
    usefulLifeMonths: new Prisma.Decimal(item.usefulLifeMonths),
    remainingMonths: new Prisma.Decimal(item.remainingMonths),
    assetAccount: item.assetAccount.trim(),
    depreciationAccount: item.depreciationAccount.trim(),
  }
}

function toFixedAssetBalanceDto(r: FixedAssetOpeningBalance) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    assetType: r.assetType,
    department: r.department,
    originalCost: r.originalCost.toString(),
    depreciableValue: r.depreciableValue.toString(),
    accumulatedDepreciation: r.accumulatedDepreciation.toString(),
    acquisitionDate: r.acquisitionDate.toISOString(),
    depreciationDate: r.depreciationDate.toISOString(),
    usefulLifeMonths: r.usefulLifeMonths.toString(),
    remainingMonths: r.remainingMonths.toString(),
    assetAccount: r.assetAccount,
    depreciationAccount: r.depreciationAccount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
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
