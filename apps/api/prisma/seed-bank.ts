// Seed dữ liệu Tiền gửi từ file MISA xuất Excel.
// Chạy: pnpm --filter @app/api exec ts-node prisma/seed-bank.ts
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { BankVoucherType, PrismaClient, Prisma } from '@prisma/client'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import { parseBankXlsx } from '../src/modules/bank/bank-import'

const XLSX_PATH = join(
  __dirname,
  '../../../docs/misa-specs/02-tien-gui/Thu_chi_tien_gui.xlsx',
)

async function main() {
  const prisma = new PrismaClient()
  try {
    const parsed = parseBankXlsx(readFileSync(XLSX_PATH))
    console.log(`Đọc ${parsed.length} chứng từ từ Excel`)

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await prisma.bankVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))

    const vouchers: Prisma.BankVoucherCreateManyInput[] = []
    const lines: Prisma.BankVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      seen.add(p.voucherNo)
      const id = randomUUID()
      const isReceipt = p.type === BankVoucherType.RECEIPT
      vouchers.push({
        id,
        type: p.type,
        category: p.category,
        voucherNo: p.voucherNo,
        postingDate: p.date,
        voucherDate: p.date,
        bankAccountNo: p.bankAccountNo,
        partnerName: p.partnerName,
        reason: p.reason,
        totalAmount: new Prisma.Decimal(p.amount),
        branchId: p.branchId,
      })
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        description: p.description,
        debitAccount: isReceipt ? CHART_OF_ACCOUNTS.BANK_DEPOSIT : '',
        creditAccount: isReceipt ? '' : CHART_OF_ACCOUNTS.BANK_DEPOSIT,
        amount: new Prisma.Decimal(p.amount),
      })
    }

    if (vouchers.length) {
      await prisma.bankVoucher.createMany({ data: vouchers })
      await prisma.bankVoucherLine.createMany({ data: lines })
    }
    console.log(
      `Seed xong: ${vouchers.length} mới, bỏ qua ${parsed.length - vouchers.length} trùng.`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
