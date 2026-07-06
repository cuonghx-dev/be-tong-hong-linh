// Seed phân hệ Bán hàng từ dữ liệu MISA (docs/misa-specs/04-ban-hang).
// Nguồn: Ban_hang.xlsx (chứng từ) · Danh_sach_khach_hang.xlsx (KH) · Hoa_don.xlsx (HĐ).
// Chạy: pnpm --filter @app/api seed   (hoặc: node prisma/seed.mjs)
import { PrismaClient, InvoiceIssueStatus, PaymentMethod, SalesPaymentMode, SalesVoucherType } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import xlsx from 'xlsx'

const prisma = new PrismaClient()
const SPEC_DIR = path.resolve(import.meta.dirname, '../../../docs/misa-specs/04-ban-hang')
const CHUNK = 1000

// Excel serial (ngày) → Date (UTC midnight). Chấp nhận cả Date sẵn có.
function toDate(v) {
  if (v == null) return null
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()))
  if (typeof v === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function rows(file, sheetIdx = 0) {
  const wb = xlsx.readFile(path.join(SPEC_DIR, file))
  const ws = wb.Sheets[wb.SheetNames[sheetIdx]]
  return xlsx.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false })
}

// Bảng có 1 dòng tiêu đề nhóm + 1 dòng header cột → dữ liệu từ index 2.
function dataRows(all) {
  return all.slice(2).filter((r) => Array.isArray(r) && r.some((c) => c != null))
}

async function chunked(items, fn) {
  for (let i = 0; i < items.length; i += CHUNK) await fn(items.slice(i, i + CHUNK))
}

async function main() {
  console.log('Xóa dữ liệu bán hàng cũ…')
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "invoices","sales_voucher_lines","sales_vouchers","customers" RESTART IDENTITY CASCADE',
  )

  // ── 1. Khách hàng ──────────────────────────────────────────────────────────
  // 1a. Master (mã thật) — key theo tên để map với chứng từ.
  const customers = []
  const byName = new Map() // tên KH → id
  const usedCodes = new Set()

  for (const r of dataRows(rows('Danh_sach_khach_hang.xlsx'))) {
    const [, code, name, address, , taxCode, phone, , isInternal, branch] = r
    if (!name) continue
    const id = randomUUID()
    const finalCode = code && !usedCodes.has(code) ? code : `KH${String(customers.length + 1).padStart(5, '0')}`
    usedCodes.add(finalCode)
    customers.push({
      id,
      code: finalCode,
      name: String(name).trim(),
      type: 'ORG',
      taxCode: taxCode ? String(taxCode) : null,
      phone: phone ? String(phone) : null,
      address: address ? String(address) : null,
      isInternal: !!(isInternal && String(isInternal).trim()),
    })
    byName.set(String(name).trim(), id)
  }

  // 1b. Khách lẻ xuất hiện trong chứng từ nhưng chưa có trong master → tạo mới (cá nhân).
  const salesRows = dataRows(rows('Ban_hang.xlsx'))
  for (const r of salesRows) {
    const name = r[4] ? String(r[4]).trim() : null
    if (!name || byName.has(name)) continue
    const id = randomUUID()
    let code = `KH${String(customers.length + 1).padStart(5, '0')}`
    while (usedCodes.has(code)) code = `KH${String(customers.length + 1 + Math.floor(Math.random() * 9)).padStart(5, '0')}`
    usedCodes.add(code)
    customers.push({ id, code, name, type: 'INDIVIDUAL' })
    byName.set(name, id)
  }

  await chunked(customers, (c) => prisma.customer.createMany({ data: c }))
  console.log(`Khách hàng: ${customers.length}`)

  // ── 2. Hóa đơn (enrich theo số hóa đơn) ─────────────────────────────────────
  const invoiceByNo = new Map()
  for (const r of dataRows(rows('Hoa_don.xlsx'))) {
    const [, invDate, invNo, type, status, , value, , issue, cqt, taxSubmit, , sendStatus] = r
    if (!invNo) continue
    invoiceByNo.set(String(invNo), {
      invoiceDate: toDate(invDate),
      invoiceType: type ? String(type) : null,
      status: status ? String(status) : 'Hóa đơn mới',
      value: Number(value) || 0,
      issued: issue === 'Đã cấp mã',
      cqt: cqt ? String(cqt) : null,
      taxSubmit: taxSubmit ? String(taxSubmit) : null,
      sendStatus: sendStatus ? String(sendStatus) : null,
    })
  }

  // ── 3. Chứng từ bán hàng + dòng hàng + hóa đơn liên kết ──────────────────────
  const vouchers = []
  const lines = []
  const invoices = []
  const seenNo = new Set()

  for (const r of salesRows) {
    const [, hachToan, voucherNo, invNo, khName, total, ttLap, ttThanhToan, , branch] = r
    if (!voucherNo || seenNo.has(String(voucherNo))) continue
    seenNo.add(String(voucherNo))
    const date = toDate(hachToan) ?? new Date()
    const amount = Number(total) || 0
    const paid = ttThanhToan === 'Đã thanh toán'
    const withInvoice = ttLap === 'Đã lập' && !!invNo
    const customerId = khName ? byName.get(String(khName).trim()) ?? null : null
    const vId = randomUUID()

    vouchers.push({
      id: vId,
      voucherNo: String(voucherNo),
      voucherType: SalesVoucherType.DOMESTIC_GOODS,
      paymentMode: paid ? SalesPaymentMode.PAID_NOW : SalesPaymentMode.UNPAID,
      paymentMethod: paid ? PaymentMethod.CASH : null,
      withInvoice,
      isInventoryIssue: true,
      postingDate: date,
      voucherDate: date,
      customerId,
      customerName: khName ? String(khName).trim() : null,
      description: 'Bán hàng',
      totalGoods: amount,
      totalVat: 0,
      totalAmount: amount,
      branchId: branch ? String(branch) : null,
    })
    lines.push({
      id: randomUUID(),
      voucherId: vId,
      lineNo: 1,
      itemName: 'Hàng hóa, dịch vụ',
      tradeDiscount: 0,
      debtAccount: paid ? '1111' : '131',
      revenueAccount: '5111',
      quantity: 1,
      unitPrice: amount,
      amount,
      vatRate: 0,
      vatAmount: 0,
      vatAccount: '33311',
    })
    if (withInvoice) {
      const meta = invoiceByNo.get(String(invNo))
      invoices.push({
        id: randomUUID(),
        invoiceNo: String(invNo),
        invoiceType: meta?.invoiceType ?? 'Hóa đơn từ máy tính tiền',
        status: meta?.status ?? 'Hóa đơn mới',
        issueStatus: meta?.issued ? InvoiceIssueStatus.CODE_ISSUED : InvoiceIssueStatus.UNISSUED,
        taxAuthorityCode: meta?.cqt ?? null,
        taxSubmitStatus: meta?.taxSubmit ?? null,
        sendStatus: meta?.sendStatus ?? null,
        invoiceDate: meta?.invoiceDate ?? date,
        posted: !!meta?.issued,
        salesVoucherId: vId,
        customerId,
        customerName: khName ? String(khName).trim() : null,
        totalAmount: amount,
        branchId: branch ? String(branch) : null,
      })
    }
  }

  await chunked(vouchers, (c) => prisma.salesVoucher.createMany({ data: c }))
  console.log(`Chứng từ bán hàng: ${vouchers.length}`)
  await chunked(lines, (c) => prisma.salesVoucherLine.createMany({ data: c }))
  console.log(`Dòng hàng: ${lines.length}`)
  await chunked(invoices, (c) => prisma.invoice.createMany({ data: c }))
  console.log(`Hóa đơn: ${invoices.length}`)
}

main()
  .then(() => console.log('Seed xong.'))
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
