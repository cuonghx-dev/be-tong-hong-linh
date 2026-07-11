// Seed danh mục ngân hàng từ file MISA (Danh_sach_ngan_hang.xlsx).
// Chạy: pnpm --filter @app/api exec ts-node prisma/seed-catalog-banks.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient, Prisma } from '@prisma/client'
import { parseBankXlsx } from '../src/modules/catalog/bank-import'

const XLSX_PATH = join(__dirname, '../../../docs/misa-specs/Danh_sach_ngan_hang.xlsx')

async function main() {
  const prisma = new PrismaClient()
  try {
    const parsed = parseBankXlsx(readFileSync(XLSX_PATH))
    console.log(`Đọc ${parsed.length} ngân hàng từ Excel`)

    const shortNames = parsed.map((p) => p.shortName)
    const existing = await prisma.bank.findMany({
      where: { shortName: { in: shortNames } },
      select: { shortName: true },
    })
    const seen = new Set(existing.map((e) => e.shortName))

    const data: Prisma.BankCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.shortName)) continue
      seen.add(p.shortName)
      data.push({ shortName: p.shortName, fullName: p.fullName, isActive: p.isActive })
    }

    if (data.length) await prisma.bank.createMany({ data })
    console.log(`Seed xong: ${data.length} mới, bỏ qua ${parsed.length - data.length} trùng.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
