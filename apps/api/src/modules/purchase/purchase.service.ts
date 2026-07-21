import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  BankVoucherCategory,
  CashVoucherCategory,
  PaymentMethod,
  Prisma,
  PurchasePaymentMode,
  PurchaseVoucherType,
  type PurchaseVoucher,
  type PurchaseVoucherLine,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { buildPartnerLookup } from '../../database/partner-lookup'
import { BankService, type PurchaseBankPaymentInput } from '../bank/bank.service'
import { BookLockService } from '../book-lock/book-lock.service'
import { CashService, type PurchasePaymentInput } from '../cash/cash.service'
import { ReceiptService, type PurchaseReceiptInput } from '../inventory/receipt.service'
import { CreatePurchaseVoucherDto, CreatePurchaseVoucherLineDto } from './dto/create-purchase-voucher.dto'
import { PurchaseVoucherFilterDto } from './dto/purchase-voucher-filter.dto'
import { parsePurchaseXlsx } from './purchase-import'
import { UpdatePurchaseVoucherDto } from './dto/update-purchase-voucher.dto'

type VoucherWithLines = PurchaseVoucher & { lines: PurchaseVoucherLine[] }

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
    private readonly cash: CashService,
    private readonly bank: BankService,
    private readonly receipt: ReceiptService,
  ) {}

  async list(
    filter: PurchaseVoucherFilterDto,
  ): Promise<Paginated<ReturnType<typeof toVoucherDto>>> {
    const where: Prisma.PurchaseVoucherWhereInput = {}
    if (filter.type) where.type = filter.type
    if (filter.supplierId) where.supplierId = filter.supplierId
    if (filter.receiveStatus) where.receiveStatus = filter.receiveStatus
    if (filter.paymentStatus) where.paymentStatus = filter.paymentStatus
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { invoiceNo: { contains: filter.keyword, mode: 'insensitive' } },
        { supplierName: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchaseVoucher.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.purchaseVoucher.count({ where }),
    ])

    return {
      data: rows.map(toVoucherDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const voucher = await this.prisma.purchaseVoucher.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!voucher) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    return this.toDetailDto(voucher)
  }

  // DTO chi tiết kèm số các chứng từ tự sinh (hiện link tham chiếu trên form).
  private async toDetailDto(v: VoucherWithLines) {
    const [paymentNo, bankPaymentNo, receiptNo] = await Promise.all([
      v.paymentId ? this.cash.findVoucherNo(v.paymentId) : null,
      v.bankPaymentId ? this.bank.findVoucherNo(v.bankPaymentId) : null,
      v.receiptId ? this.receipt.findVoucherNo(v.receiptId) : null,
    ])
    return { ...toVoucherDto(v), paymentNo, bankPaymentNo, receiptNo }
  }

  // Xem trước số chứng từ kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  // Đánh số theo tùy chọn thanh toán như MISA: MH/MDV thanh toán ngay TM → số PC,
  // CK → số UNC (dùng chung với phiếu chi/UNC tự sinh); còn lại → NK/MH/MDV.
  async previewNextVoucherNo(
    type: PurchaseVoucherType,
    voucherDate?: string,
    paymentMode?: PurchasePaymentMode,
    paymentMethod?: PaymentMethod,
  ) {
    const date = voucherDate ? new Date(voucherDate) : new Date()
    const mode = paymentMode ?? PurchasePaymentMode.UNPAID
    const method = paymentMethod ?? null
    if (sharesPaymentNo(type, mode, method)) {
      return paysBankNow(mode, method)
        ? { voucherNo: await this.bank.nextPaymentNo(this.prisma, date) }
        : { voucherNo: await this.cash.nextPaymentNo(this.prisma, date) }
    }
    const voucherNo = await nextVoucherNo(this.prisma, type, date)
    return { voucherNo }
  }

  async create(dto: CreatePurchaseVoucherDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    const created = await this.prisma.$transaction(async (tx) => {
      const vDate = new Date(dto.voucherDate)
      const method = dto.paymentMethod ?? null
      const wantsCash = paysCashNow(dto.paymentMode, method)
      const wantsBank = paysBankNow(dto.paymentMode, method)
      // Số chứng từ theo tùy chọn thanh toán (MISA): MH/MDV trả ngay TM/CK dùng chung
      // số PC/UNC với chứng từ chi tự sinh; nhập kho giữ dãy NK riêng (PC/UNC số riêng).
      const shared = sharesPaymentNo(dto.type, dto.paymentMode, method)
      const voucherNo = shared
        ? wantsBank
          ? await this.bank.nextPaymentNo(tx, vDate)
          : await this.cash.nextPaymentNo(tx, vDate)
        : await nextVoucherNo(tx, dto.type, vDate)
      const lines = normalizeLines(dto.type, dto.lines, wantsCash, wantsBank)
      const totals = computeTotals(lines, dto.purchaseCost ?? 0)
      const voucher = await tx.purchaseVoucher.create({
        data: {
          type: dto.type,
          origin: dto.origin ?? 'DOMESTIC',
          paymentMode: dto.paymentMode,
          paymentMethod: dto.paymentMethod ?? null,
          receiveWithInvoice: dto.receiveWithInvoice ?? false,
          voucherNo,
          invoiceNo: dto.invoiceNo ?? null,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          supplierId: dto.supplierId ?? null,
          supplierName: dto.supplierName ?? null,
          deliverer: dto.deliverer ?? null,
          address: dto.address ?? null,
          employeeId: dto.employeeId ?? null,
          description: dto.description ?? 'Mua hàng',
          attachmentCount: dto.attachmentCount ?? 0,
          contractNo: dto.contractNo ?? null,
          paymentTermId: dto.paymentTermId ?? null,
          creditDays: dto.creditDays ?? null,
          dueDate: resolveDueDate(dto),
          purchaseCost: new Prisma.Decimal(dto.purchaseCost ?? 0),
          ...totals,
          receiveStatus: dto.receiveWithInvoice ? 'RECEIVED' : 'NOT_RECEIVED',
          paymentStatus: dto.paymentMode === 'IMMEDIATE' ? 'PAID' : 'UNPAID',
          branchId: dto.branchId ?? null,
          bankAccountNo: wantsBank ? dto.bankAccountNo ?? null : null,
          bankName: wantsBank ? dto.bankName ?? null : null,
          einvoiceLookupCode: dto.einvoiceLookupCode ?? null,
          einvoiceLookupUrl: dto.einvoiceLookupUrl ?? null,
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })

      // Chứng từ tự sinh kèm theo (mirror §11 bán hàng): trả ngay TM → PC, CK → UNC
      // (MH/MDV cùng số, NK giữ số NK và PC/UNC nhận số riêng); nhập kho → phiếu
      // nhập kho dùng chung số NK (trả ngay thì phiếu nhập nhận số NK riêng).
      const links: Prisma.PurchaseVoucherUpdateInput = {}
      if (wantsCash) {
        links.paymentId = await this.cash.createPurchasePayment(
          tx,
          buildCashPaymentInput(voucher),
          shared ? voucherNo : undefined,
        )
      }
      if (wantsBank) {
        links.bankPaymentId = await this.bank.createPurchasePayment(
          tx,
          buildBankPaymentInput(voucher),
          shared ? voucherNo : undefined,
        )
      }
      if (voucher.type === PurchaseVoucherType.STOCK) {
        links.receiptId = await this.receipt.createPurchaseReceipt(
          tx,
          buildReceiptInput(voucher),
          voucherNo.startsWith('NK') ? voucherNo : undefined,
        )
      }
      if (Object.keys(links).length > 0) {
        return tx.purchaseVoucher.update({
          where: { id: voucher.id },
          data: links,
          include: { lines: { orderBy: { lineNo: 'asc' } } },
        })
      }

      return voucher
    })
    return this.toDetailDto(created)
  }

  async update(id: string, dto: UpdatePurchaseVoucherDto) {
    const existing = await this.prisma.purchaseVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.PurchaseVoucherUpdateInput = {
        origin: dto.origin ?? undefined,
        paymentMode: dto.paymentMode ?? undefined,
        paymentMethod: dto.paymentMethod ?? undefined,
        receiveWithInvoice: dto.receiveWithInvoice ?? undefined,
        invoiceNo: dto.invoiceNo ?? undefined,
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        supplierId: dto.supplierId ?? undefined,
        supplierName: dto.supplierName ?? undefined,
        deliverer: dto.deliverer ?? undefined,
        address: dto.address ?? undefined,
        employeeId: dto.employeeId ?? undefined,
        description: dto.description ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        contractNo: dto.contractNo ?? undefined,
        paymentTermId: dto.paymentTermId ?? undefined,
        creditDays: dto.creditDays ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        einvoiceLookupCode: dto.einvoiceLookupCode ?? undefined,
        einvoiceLookupUrl: dto.einvoiceLookupUrl ?? undefined,
        branchId: dto.branchId ?? undefined,
      }
      if (dto.paymentMode) data.paymentStatus = dto.paymentMode === 'IMMEDIATE' ? 'PAID' : 'UNPAID'
      if (dto.receiveWithInvoice !== undefined) {
        data.receiveStatus = dto.receiveWithInvoice ? 'RECEIVED' : 'NOT_RECEIVED'
      }

      const mode = dto.paymentMode ?? existing.paymentMode
      const method =
        (dto.paymentMethod !== undefined ? dto.paymentMethod : existing.paymentMethod) ?? null
      const wantsCash = paysCashNow(mode, method)
      const wantsBank = paysBankNow(mode, method)
      data.bankAccountNo = wantsBank
        ? dto.bankAccountNo !== undefined
          ? dto.bankAccountNo
          : undefined
        : null
      data.bankName = wantsBank ? (dto.bankName !== undefined ? dto.bankName : undefined) : null

      if (dto.lines) {
        const lines = normalizeLines(existing.type, dto.lines, wantsCash, wantsBank)
        const cost = dto.purchaseCost ?? Number(existing.purchaseCost)
        Object.assign(data, computeTotals(lines, cost))
        data.purchaseCost = new Prisma.Decimal(cost)
        await tx.purchaseVoucherLine.deleteMany({ where: { voucherId: id } })
        data.lines = { create: lines }
      } else if (dto.purchaseCost !== undefined) {
        data.purchaseCost = new Prisma.Decimal(dto.purchaseCost)
        data.stockValue = new Prisma.Decimal(dto.purchaseCost).add(existing.totalGoods)
      }

      // Đổi tùy chọn thanh toán không kèm dòng mới → đổi vế Có mặc định của dòng
      // cũ (331 ↔ 1111/1121) cho khớp định khoản; giữ TK người dùng đã sửa tay.
      if (!dto.lines) {
        const target = wantsCash
          ? CHART_OF_ACCOUNTS.CASH_ON_HAND
          : wantsBank
            ? CHART_OF_ACCOUNTS.BANK_DEPOSIT
            : CHART_OF_ACCOUNTS.PAYABLE
        await tx.purchaseVoucherLine.updateMany({
          where: {
            voucherId: id,
            payableAccount: {
              in: [
                CHART_OF_ACCOUNTS.PAYABLE,
                CHART_OF_ACCOUNTS.CASH_ON_HAND,
                CHART_OF_ACCOUNTS.BANK_DEPOSIT,
              ],
              not: target,
            },
          },
          data: { payableAccount: target },
        })
      }

      const voucher = await tx.purchaseVoucher.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })

      // Đồng bộ chứng từ tự sinh theo tùy chọn mới (mirror §11 bán hàng). Số chứng
      // từ mua giữ nguyên sau khi tạo; chứng từ sinh lại khi đổi tùy chọn nhận số mới.
      const links: Prisma.PurchaseVoucherUpdateInput = {}

      // Phiếu chi tiền mặt (PURCHASE_*_CASH)
      if (wantsCash) {
        const paymentId = await this.cash.upsertPurchasePayment(
          tx,
          existing.paymentId,
          buildCashPaymentInput(voucher),
        )
        if (paymentId !== existing.paymentId) links.paymentId = paymentId
      } else if (existing.paymentId) {
        await this.cash.deletePurchasePayment(tx, existing.paymentId)
        links.paymentId = null
      }

      // UNC chi tiền gửi (PURCHASE_*_BANK)
      if (wantsBank) {
        const bankPaymentId = await this.bank.upsertPurchasePayment(
          tx,
          existing.bankPaymentId,
          buildBankPaymentInput(voucher),
        )
        if (bankPaymentId !== existing.bankPaymentId) links.bankPaymentId = bankPaymentId
      } else if (existing.bankPaymentId) {
        await this.bank.deletePurchasePayment(tx, existing.bankPaymentId)
        links.bankPaymentId = null
      }

      // Phiếu nhập kho (loại nhập kho — type không đổi sau khi tạo)
      if (voucher.type === PurchaseVoucherType.STOCK) {
        const receiptId = await this.receipt.upsertPurchaseReceipt(
          tx,
          existing.receiptId,
          buildReceiptInput(voucher),
          voucher.voucherNo.startsWith('NK') ? voucher.voucherNo : undefined,
        )
        if (receiptId !== existing.receiptId) links.receiptId = receiptId
      }

      if (Object.keys(links).length > 0) {
        return tx.purchaseVoucher.update({
          where: { id },
          data: links,
          include: { lines: { orderBy: { lineNo: 'asc' } } },
        })
      }

      return voucher
    })
    return this.toDetailDto(updated)
  }

  // Nhập khẩu chứng từ mua hàng từ file Excel (mức tổng hợp). Bỏ qua số chứng từ trùng.
  async importXlsx(buffer: Buffer) {
    const parsed = parsePurchaseXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.purchaseVoucher.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()
    const lookup = await buildPartnerLookup(this.prisma)

    const vouchers: Prisma.PurchaseVoucherCreateManyInput[] = []
    const lines: Prisma.PurchaseVoucherLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file

      // Tách tiền hàng / thuế từ số tổng hợp Excel (§10.2, §10.4):
      //   nhập kho: giá trị nhập kho = tiền hàng + chi phí → tiền hàng = GT nhập kho − chi phí;
      //   thuế = tổng TT − tiền hàng. Loại khác không có GT nhập kho → coi toàn bộ là tiền hàng.
      const cost = new Prisma.Decimal(p.purchaseCost)
      const payment = new Prisma.Decimal(p.totalPayment)
      const stock = new Prisma.Decimal(p.stockValue)
      const totalGoods =
        p.type === PurchaseVoucherType.STOCK && p.stockValue > 0 ? stock.sub(cost) : payment
      const totalVat = payment.sub(totalGoods)
      const vatRate = totalGoods.gt(0)
        ? new Prisma.Decimal(totalVat.div(totalGoods).mul(100).toDecimalPlaces(0))
        : new Prisma.Decimal(0)

      const id = randomUUID()
      vouchers.push({
        id,
        type: p.type,
        paymentMode: p.paymentStatus === 'PAID' ? 'IMMEDIATE' : 'UNPAID',
        receiveWithInvoice: p.receiveStatus === 'RECEIVED',
        voucherNo: p.voucherNo,
        invoiceNo: p.invoiceNo,
        postingDate: p.date,
        voucherDate: p.date,
        supplierId: lookup.supplier(p.supplierName)?.id ?? null,
        supplierName: p.supplierName,
        description: 'Mua hàng',
        totalGoods,
        totalVat,
        totalPayment: payment,
        purchaseCost: cost,
        stockValue: p.type === PurchaseVoucherType.STOCK ? stock : totalGoods,
        receiveStatus: p.receiveStatus,
        paymentStatus: p.paymentStatus,
        branchId: p.branchId,
      })
      lines.push({
        id: randomUUID(),
        voucherId: id,
        lineNo: 1,
        stockAccount: defaultStockAccount(p.type),
        payableAccount: CHART_OF_ACCOUNTS.PAYABLE,
        quantity: new Prisma.Decimal(1),
        unitPrice: totalGoods,
        amount: totalGoods,
        vatRate,
        vatAmount: totalVat,
        vatAccount: CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < vouchers.length; i += chunk) {
      await this.prisma.purchaseVoucher.createMany({ data: vouchers.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.purchaseVoucherLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: vouchers.length, skipped: parsed.length - vouchers.length }
  }

  // Ghi sổ / bỏ ghi: chỉ đổi cờ posted (không đụng dòng hàng tiền). Bỏ ghi =
  // đưa về nháp → loại khỏi sổ mua hàng + báo cáo. Kỳ đã khóa sổ thì không cho đổi.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.purchaseVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.$transaction(async (tx) => {
      const voucher = await tx.purchaseVoucher.update({
        where: { id },
        data: { posted },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
      // Ghi sổ / bỏ ghi lan sang mọi chứng từ tự sinh — cùng trạng thái sổ.
      if (voucher.paymentId) await this.cash.setPurchasePaymentPosted(tx, voucher.paymentId, posted)
      if (voucher.bankPaymentId)
        await this.bank.setPurchasePaymentPosted(tx, voucher.bankPaymentId, posted)
      if (voucher.receiptId)
        await this.receipt.setPurchaseReceiptPosted(tx, voucher.receiptId, posted)
      return voucher
    })
    return this.toDetailDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.purchaseVoucher.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseVoucher.delete({ where: { id } })
      // Xóa kèm mọi chứng từ tự sinh — không để chứng từ mồ côi khi mất chứng từ gốc.
      if (existing.paymentId) await this.cash.deletePurchasePayment(tx, existing.paymentId)
      if (existing.bankPaymentId) await this.bank.deletePurchasePayment(tx, existing.bankPaymentId)
      if (existing.receiptId) await this.receipt.deletePurchaseReceipt(tx, existing.receiptId)
    })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Thanh toán ngay không qua ngân hàng → sinh Phiếu chi tiền mặt (mirror
// needsCashReceipt bên bán hàng).
function paysCashNow(
  paymentMode: PurchasePaymentMode,
  paymentMethod: PaymentMethod | null,
): boolean {
  return (
    paymentMode === PurchasePaymentMode.IMMEDIATE && paymentMethod !== PaymentMethod.BANK_TRANSFER
  )
}

// Thanh toán ngay chuyển khoản → sinh UNC chi tiền gửi (mirror needsBankReceipt).
function paysBankNow(
  paymentMode: PurchasePaymentMode,
  paymentMethod: PaymentMethod | null,
): boolean {
  return (
    paymentMode === PurchasePaymentMode.IMMEDIATE && paymentMethod === PaymentMethod.BANK_TRANSFER
  )
}

// MH/MDV trả ngay dùng chung số PC/UNC với chứng từ chi tự sinh (MISA: PC 0101/2026,
// UNC0101/2026); nhập kho giữ dãy NK riêng — PC/UNC kèm theo nhận số kế tiếp độc lập.
function sharesPaymentNo(
  type: PurchaseVoucherType,
  paymentMode: PurchasePaymentMode,
  paymentMethod: PaymentMethod | null,
): boolean {
  return (
    (paysCashNow(paymentMode, paymentMethod) || paysBankNow(paymentMode, paymentMethod)) &&
    type !== PurchaseVoucherType.STOCK
  )
}

// Chứng từ chi tự sinh mirror chứng từ mua trả ngay: mỗi dòng hàng 1 dòng Nợ TK
// kho/chi phí, thuế GTGT gộp theo TK thuế (thường 1331); TK Có (1111/1121) do
// Cash/BankService gán. LƯU Ý: định khoản gốc đã nằm trong dòng chứng từ mua
// (Có 111x/112x thay 331) — sổ nhật ký loại PC/UNC dẫn xuất để không đếm trùng
// (xem report.service).
function buildPaymentCore(v: VoucherWithLines) {
  const lines = v.lines.map((l) => ({
    description: l.itemName,
    debitAccount: l.stockAccount ?? defaultStockAccount(v.type),
    amount: l.amount,
  }))
  const vatByAccount = new Map<string, Prisma.Decimal>()
  for (const l of v.lines) {
    if (l.vatAmount.isZero()) continue
    vatByAccount.set(
      l.vatAccount,
      (vatByAccount.get(l.vatAccount) ?? new Prisma.Decimal(0)).add(l.vatAmount),
    )
  }
  for (const [account, amount] of vatByAccount) {
    lines.push({ description: 'Thuế GTGT đầu vào', debitAccount: account, amount })
  }
  const noun = v.type === PurchaseVoucherType.SERVICE ? 'dịch vụ' : 'hàng'
  return {
    postingDate: v.postingDate,
    voucherDate: v.voucherDate,
    supplierId: v.supplierId,
    supplierName: v.supplierName,
    address: v.address,
    // Diễn giải theo mẫu MISA: "Chi tiền mua hàng của <NCC> theo hóa đơn số <n>".
    reason: `Chi tiền mua ${noun}${v.supplierName ? ` của ${v.supplierName}` : ''}${v.invoiceNo ? ` theo hóa đơn số ${v.invoiceNo}` : ''}`,
    branchId: v.branchId,
    posted: v.posted,
    lines,
  }
}

function buildCashPaymentInput(v: VoucherWithLines): PurchasePaymentInput {
  return {
    category:
      v.type === PurchaseVoucherType.SERVICE
        ? CashVoucherCategory.PURCHASE_SERVICE_CASH
        : CashVoucherCategory.PURCHASE_GOODS_CASH,
    ...buildPaymentCore(v),
  }
}

function buildBankPaymentInput(v: VoucherWithLines): PurchaseBankPaymentInput {
  return {
    category:
      v.type === PurchaseVoucherType.SERVICE
        ? BankVoucherCategory.PURCHASE_SERVICE_BANK
        : BankVoucherCategory.PURCHASE_GOODS_BANK,
    bankAccountNo: v.bankAccountNo,
    bankName: v.bankName,
    ...buildPaymentCore(v),
  }
}

// Phiếu nhập tự sinh mirror chứng từ mua nhập kho: dòng hàng giữ nguyên định khoản
// Nợ TK kho / Có TK công nợ-quỹ (đã nằm ở purchase_voucher_lines — report khử trùng).
// Diễn giải theo mẫu MISA để importer/report nhận diện: "Mua hàng của <NCC> ...".
function buildReceiptInput(v: VoucherWithLines): PurchaseReceiptInput {
  return {
    postingDate: v.postingDate,
    voucherDate: v.voucherDate,
    supplierId: v.supplierId,
    supplierName: v.supplierName,
    address: v.address,
    deliverer: v.deliverer,
    description: `Mua hàng${v.supplierName ? ` của ${v.supplierName}` : ''}${v.invoiceNo ? ` theo hóa đơn số ${v.invoiceNo}` : ''}`,
    reference: v.voucherNo,
    posted: v.posted,
    lines: v.lines.map((l) => ({
      itemId: l.itemId,
      itemName: l.itemName,
      warehouseId: l.warehouseId,
      debitAccount: l.stockAccount,
      creditAccount: l.payableAccount,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.amount,
    })),
  }
}

// Định khoản mặc định theo loại chứng từ (§5):
//   nhập kho → TK Kho 152/156; không qua kho / dịch vụ → chi phí 642.
function defaultStockAccount(type: PurchaseVoucherType): string {
  return type === PurchaseVoucherType.STOCK ? CHART_OF_ACCOUNTS.GOODS : CHART_OF_ACCOUNTS.SERVICE_EXPENSE
}

function normalizeLines(
  type: PurchaseVoucherType,
  lines: CreatePurchaseVoucherLineDto[],
  paysCash: boolean,
  paysBank = false,
) {
  return lines.map((line, i) => {
    const quantity = new Prisma.Decimal(line.quantity)
    const unitPrice = new Prisma.Decimal(line.unitPrice)
    const amount = quantity.mul(unitPrice)
    const vatRate = new Prisma.Decimal(line.vatRate ?? 0)
    const vatAmount = amount.mul(vatRate).div(100)
    // Trả ngay: vế Có của dòng hàng là quỹ 111x (TM) / tiền gửi 112x (CK) thay
    // công nợ 331 (MISA đổi TK tự động); giá trị người dùng nhập chỉ giữ khi
    // vẫn thuộc đúng nhóm TK đó.
    const payableAccount = paysCash
      ? line.payableAccount?.startsWith(CHART_OF_ACCOUNTS.CASH)
        ? line.payableAccount
        : CHART_OF_ACCOUNTS.CASH_ON_HAND
      : paysBank
        ? line.payableAccount?.startsWith(CHART_OF_ACCOUNTS.BANK)
          ? line.payableAccount
          : CHART_OF_ACCOUNTS.BANK_DEPOSIT
        : line.payableAccount || CHART_OF_ACCOUNTS.PAYABLE
    return {
      lineNo: i + 1,
      itemId: line.itemId ?? null,
      itemName: line.itemName ?? null,
      warehouseId: type === PurchaseVoucherType.STOCK ? line.warehouseId ?? null : null,
      stockAccount: line.stockAccount || defaultStockAccount(type),
      payableAccount,
      unit: line.unit ?? null,
      quantity,
      unitPrice,
      amount,
      vatRate,
      vatAmount,
      vatAccount: line.vatAccount || CHART_OF_ACCOUNTS.VAT_INPUT_DEDUCTIBLE,
    }
  })
}

// §10.2: Tổng tiền hàng = Σ thành tiền; Thuế = Σ tiền thuế;
// Tổng TT = hàng + thuế; Giá trị nhập kho = tiền hàng + chi phí mua hàng phân bổ (§10.4).
function computeTotals(
  lines: { amount: Prisma.Decimal; vatAmount: Prisma.Decimal }[],
  purchaseCost: number,
) {
  const totalGoods = lines.reduce((s, l) => s.add(l.amount), new Prisma.Decimal(0))
  const totalVat = lines.reduce((s, l) => s.add(l.vatAmount), new Prisma.Decimal(0))
  const cost = new Prisma.Decimal(purchaseCost)
  return {
    totalGoods,
    totalVat,
    totalPayment: totalGoods.add(totalVat),
    stockValue: totalGoods.add(cost),
  }
}

// §10.5: Hạn TT = ngày chứng từ + số ngày được nợ (nếu chưa có dueDate rõ ràng).
function resolveDueDate(dto: CreatePurchaseVoucherDto): Date | null {
  if (dto.dueDate) return new Date(dto.dueDate)
  if (dto.creditDays && dto.creditDays > 0) {
    const d = new Date(dto.voucherDate)
    d.setDate(d.getDate() + dto.creditDays)
    return d
  }
  return null
}

// Số chứng từ auto tăng theo prefix loại NV (§10.1):
//   nhập kho:      NK####      (không kèm năm)
//   không qua kho: MH####/YYYY
//   dịch vụ:       MDV####/YYYY
async function nextVoucherNo(
  tx: Prisma.TransactionClient,
  type: PurchaseVoucherType,
  voucherDate: Date,
): Promise<string> {
  // Số kế tiếp = MAX(số hiện có) + 1 — không dùng count vì bảng còn chứa chứng từ
  // mang số PC/UNC (trả ngay) và dữ liệu nhập khẩu có thể đứt quãng → count+1 gây trùng.
  // Nhập kho: dãy số chạy toàn cục, không kèm năm (vd NK07098) → không reset theo năm.
  // Dãy NK dùng CHUNG với phiếu nhập kho (chứng từ mua nhập kho kiêm phiếu nhập;
  // phiếu nhập tự sinh khi trả ngay nhận số NK riêng) → lấy MAX trên cả 2 bảng.
  if (type === PurchaseVoucherType.STOCK) {
    const fromPurchase = await tx.purchaseVoucher.findMany({
      where: { voucherNo: { startsWith: 'NK' } },
      select: { voucherNo: true },
    })
    const fromInventory = await tx.inventoryReceipt.findMany({
      where: { voucherNo: { startsWith: 'NK' } },
      select: { voucherNo: true },
    })
    const maxSeq = maxVoucherSeq([...fromPurchase, ...fromInventory])
    return `NK${String(maxSeq + 1).padStart(5, '0')}`
  }
  // MH / MDV: số reset theo năm, kèm hậu tố /YYYY.
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const prefix = type === PurchaseVoucherType.SERVICE ? 'MDV' : 'MH'
  const rows = await tx.purchaseVoucher.findMany({
    where: {
      type,
      voucherNo: { startsWith: prefix },
      voucherDate: { gte: yearStart, lt: yearEnd },
    },
    select: { voucherNo: true },
  })
  const seq = String(maxVoucherSeq(rows) + 1).padStart(4, '0')
  return `${prefix}${seq}/${year}`
}

// Lấy phần số trước dấu "/" của số chứng từ lớn nhất: "MH0326/2025" → 326.
function maxVoucherSeq(rows: { voucherNo: string }[]): number {
  return rows.reduce((max, r) => {
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function toVoucherDto(v: VoucherWithLines) {
  return {
    id: v.id,
    type: v.type,
    origin: v.origin,
    paymentMode: v.paymentMode,
    paymentMethod: v.paymentMethod,
    receiveWithInvoice: v.receiveWithInvoice,
    voucherNo: v.voucherNo,
    invoiceNo: v.invoiceNo,
    postingDate: toDateOnly(v.postingDate)!,
    voucherDate: toDateOnly(v.voucherDate)!,
    supplierId: v.supplierId,
    supplierName: v.supplierName,
    deliverer: v.deliverer,
    address: v.address,
    employeeId: v.employeeId,
    description: v.description,
    attachmentCount: v.attachmentCount,
    contractNo: v.contractNo,
    paymentTermId: v.paymentTermId,
    creditDays: v.creditDays,
    dueDate: toDateOnly(v.dueDate),
    totalGoods: v.totalGoods.toString(),
    totalVat: v.totalVat.toString(),
    totalPayment: v.totalPayment.toString(),
    purchaseCost: v.purchaseCost.toString(),
    stockValue: v.stockValue.toString(),
    posted: v.posted,
    einvoiceLookupCode: v.einvoiceLookupCode,
    einvoiceLookupUrl: v.einvoiceLookupUrl,
    paymentId: v.paymentId,
    bankPaymentId: v.bankPaymentId,
    receiptId: v.receiptId,
    bankAccountNo: v.bankAccountNo,
    bankName: v.bankName,
    receiveStatus: v.receiveStatus,
    paymentStatus: v.paymentStatus,
    branchId: v.branchId,
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      itemId: l.itemId,
      itemName: l.itemName,
      warehouseId: l.warehouseId,
      stockAccount: l.stockAccount,
      payableAccount: l.payableAccount,
      unit: l.unit,
      quantity: l.quantity.toString(),
      unitPrice: l.unitPrice.toString(),
      amount: l.amount.toString(),
      vatRate: l.vatRate.toString(),
      vatAmount: l.vatAmount.toString(),
      vatAccount: l.vatAccount,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
