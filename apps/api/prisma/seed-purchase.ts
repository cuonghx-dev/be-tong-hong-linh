// Seed dữ liệu Mua hàng từ docs/misa-specs/03-mua-hang/Mua_hang_hoa_dich_vu.xlsx.
// Idempotent: bỏ qua chứng từ đã có voucherNo; upsert NCC theo mã.
// Chạy: pnpm --filter @app/api ts-node prisma/seed-purchase.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient, Prisma, PurchaseVoucherType } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

const XLSX_PATH = join(
  __dirname,
  '../../../docs/misa-specs/03-mua-hang/Mua_hang_hoa_dich_vu.xlsx',
)

const DAY = 86_400_000

// SheetJS lệch giờ quanh nửa đêm → làm tròn về UTC-midnight gần nhất.
function toDate(v: unknown): Date {
  const d = v instanceof Date ? v : new Date(String(v))
  return Number.isNaN(d.getTime()) ? new Date() : new Date(Math.round(d.getTime() / DAY) * DAY)
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function typeFromNo(voucherNo: string): PurchaseVoucherType {
  if (voucherNo.startsWith('NK')) return PurchaseVoucherType.STOCK
  if (voucherNo.startsWith('MDV')) return PurchaseVoucherType.SERVICE
  return PurchaseVoucherType.NON_STOCK // MH
}

const STOCK_ACCT: Record<PurchaseVoucherType, string> = {
  STOCK: '156',
  NON_STOCK: '642',
  SERVICE: '642',
}

// Bỏ dấu tiếng Việt → slug mã NCC.
function slug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const words = base.split('_').filter(Boolean)
  return words.slice(0, 4).join('_').slice(0, 40) || 'NCC'
}

interface Row {
  voucherNo: string
  invoiceNo: string | null
  supplierName: string
  totalPayment: number
  purchaseCost: number
  stockValue: number
  date: Date
  branch: string | null
}

async function main() {
  const wb = XLSX.read(readFileSync(XLSX_PATH), { cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]!]!
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  const rows: Row[] = []
  for (const r of raw.slice(2)) {
    const voucherNo = toStr(r[2])
    if (!voucherNo) continue
    const supplierName = toStr(r[4])
    if (!supplierName) continue
    rows.push({
      voucherNo,
      invoiceNo: toStr(r[3]),
      supplierName,
      totalPayment: Number(r[5]) || 0,
      purchaseCost: Number(r[6]) || 0,
      stockValue: Number(r[7]) || 0,
      date: toDate(r[1]),
      branch: toStr(r[11]),
    })
  }
  console.log(`Đọc ${rows.length} chứng từ từ xlsx.`)

  // 1) NCC: mã duy nhất theo tên; công nợ = Σ tổng TT (tất cả đều "chưa thanh toán").
  const byName = new Map<string, { code: string; debt: number }>()
  const usedCodes = new Set<string>()
  for (const row of rows) {
    let entry = byName.get(row.supplierName)
    if (!entry) {
      let code = slug(row.supplierName)
      let i = 2
      while (usedCodes.has(code)) code = `${slug(row.supplierName).slice(0, 37)}_${i++}`
      usedCodes.add(code)
      entry = { code, debt: 0 }
      byName.set(row.supplierName, entry)
    }
    entry.debt += row.totalPayment
  }

  const codeByName = new Map<string, string>()
  for (const [name, { code, debt }] of byName) {
    const s = await prisma.supplier.upsert({
      where: { code },
      update: { name, debtAmount: new Prisma.Decimal(debt) },
      create: { code, name, debtAmount: new Prisma.Decimal(debt) },
    })
    codeByName.set(name, s.id)
  }
  console.log(`Upsert ${byName.size} nhà cung cấp.`)

  // 2) Chứng từ mua hàng — bỏ qua voucherNo đã tồn tại.
  const existing = new Set(
    (
      await prisma.purchaseVoucher.findMany({
        where: { voucherNo: { in: rows.map((r) => r.voucherNo) } },
        select: { voucherNo: true },
      })
    ).map((v) => v.voucherNo),
  )

  let created = 0
  for (const row of rows) {
    if (existing.has(row.voucherNo)) continue
    const type = typeFromNo(row.voucherNo)
    // Không có chi tiết dòng trong file → tổng hợp 1 dòng, tiền hàng = tổng TT (không tách VAT).
    const goods = new Prisma.Decimal(row.totalPayment)
    await prisma.purchaseVoucher.create({
      data: {
        type,
        paymentMode: 'UNPAID',
        receiveWithInvoice: true,
        voucherNo: row.voucherNo,
        invoiceNo: row.invoiceNo,
        postingDate: row.date,
        voucherDate: row.date,
        supplierId: codeByName.get(row.supplierName) ?? null,
        supplierName: row.supplierName,
        description: 'Mua hàng',
        totalGoods: goods,
        totalVat: new Prisma.Decimal(0),
        totalPayment: goods,
        purchaseCost: new Prisma.Decimal(row.purchaseCost),
        stockValue: new Prisma.Decimal(row.stockValue),
        receiveStatus: 'RECEIVED',
        paymentStatus: 'UNPAID',
        branchId: row.branch,
        lines: {
          create: {
            lineNo: 1,
            itemName: type === PurchaseVoucherType.SERVICE ? 'Dịch vụ' : 'Hàng hóa',
            stockAccount: STOCK_ACCT[type],
            payableAccount: '331',
            quantity: new Prisma.Decimal(1),
            unitPrice: goods,
            amount: goods,
            vatRate: new Prisma.Decimal(0),
            vatAmount: new Prisma.Decimal(0),
            vatAccount: '1331',
          },
        },
      },
    })
    created++
  }
  console.log(`Tạo ${created} chứng từ mới, bỏ qua ${rows.length - created} trùng.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
