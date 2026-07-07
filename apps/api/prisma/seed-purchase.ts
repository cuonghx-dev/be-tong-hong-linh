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
const SUPPLIER_XLSX_PATH = join(
  __dirname,
  '../../../docs/misa-specs/03-mua-hang/Danh_sach_nha_cung_cap.xlsx',
)

// Đọc sheet đầu → mảng theo dòng.
function readSheet(path: string): unknown[][] {
  const wb = XLSX.read(readFileSync(path), { cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]!]!
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })
}

// Text bật/tắt trong cột "Là ..." → boolean.
function toBool(v: unknown): boolean {
  const s = (toStr(v) ?? '').toLowerCase()
  return s === 'x' || s === 'có' || s === 'true' || s === '1'
}

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

  // 1) NCC: nạp từ Danh_sach_nha_cung_cap.xlsx (mã thật + MST + địa chỉ...).
  //    Công nợ ưu tiên Σ tổng TT từ chứng từ (đều "chưa thanh toán"); NCC không
  //    xuất hiện trong chứng từ giữ số nợ trong file NCC.
  const voucherDebtByName = new Map<string, number>()
  for (const row of rows) {
    voucherDebtByName.set(
      row.supplierName,
      (voucherDebtByName.get(row.supplierName) ?? 0) + row.totalPayment,
    )
  }

  // File NCC: header ở dòng 1. Cột: 1=Mã, 2=Tên, 3=Địa chỉ, 4=Nợ, 5=MST/CCCD,
  // 6=Rủi ro HĐ, 8=Điện thoại, 9=Là ĐT nội bộ.
  const nccRaw = readSheet(SUPPLIER_XLSX_PATH)
  const codeByName = new Map<string, string>()
  const usedCodes = new Set<string>()
  let nccCount = 0
  for (const r of nccRaw.slice(2)) {
    const code = toStr(r[1])
    const name = toStr(r[2])
    if (!code || !name) continue
    usedCodes.add(code)
    const debt = voucherDebtByName.get(name) ?? (Number(r[4]) || 0)
    const s = await prisma.supplier.upsert({
      where: { code },
      update: {
        name,
        address: toStr(r[3]),
        taxCode: toStr(r[5]),
        invoiceRisk: toStr(r[6]),
        phone: toStr(r[8]),
        isInternal: toBool(r[9]),
        debtAmount: new Prisma.Decimal(debt),
      },
      create: {
        code,
        name,
        address: toStr(r[3]),
        taxCode: toStr(r[5]),
        invoiceRisk: toStr(r[6]),
        phone: toStr(r[8]),
        isInternal: toBool(r[9]),
        debtAmount: new Prisma.Decimal(debt),
      },
    })
    codeByName.set(name, s.id)
    nccCount++
  }
  console.log(`Upsert ${nccCount} nhà cung cấp từ danh sách.`)

  // NCC có trong chứng từ nhưng thiếu ở danh sách → tạo mã slug tối thiểu.
  let derived = 0
  for (const name of voucherDebtByName.keys()) {
    if (codeByName.has(name)) continue
    let code = slug(name)
    let i = 2
    while (usedCodes.has(code)) code = `${slug(name).slice(0, 37)}_${i++}`
    usedCodes.add(code)
    const s = await prisma.supplier.upsert({
      where: { code },
      update: { name, debtAmount: new Prisma.Decimal(voucherDebtByName.get(name)!) },
      create: { code, name, debtAmount: new Prisma.Decimal(voucherDebtByName.get(name)!) },
    })
    codeByName.set(name, s.id)
    derived++
  }
  if (derived) console.log(`Tạo thêm ${derived} NCC suy từ chứng từ (thiếu trong danh sách).`)

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
