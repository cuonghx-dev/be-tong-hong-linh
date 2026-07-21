import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  InventoryReceiptType,
  Prisma,
  type InventoryReceipt,
  type InventoryReceiptLine,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { buildPartnerLookup } from '../../database/partner-lookup'
import { BookLockService } from '../book-lock/book-lock.service'
import { CreateInventoryReceiptDto, CreateInventoryReceiptLineDto } from './dto/create-receipt.dto'
import { InventoryReceiptFilterDto } from './dto/receipt-filter.dto'
import { UpdateInventoryReceiptDto } from './dto/update-receipt.dto'
import { parseReceiptXlsx } from './inventory-import'

type ReceiptWithLines = InventoryReceipt & { lines: InventoryReceiptLine[] }

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
  ) {}

  async list(
    filter: InventoryReceiptFilterDto,
  ): Promise<Paginated<ReturnType<typeof toReceiptDto>>> {
    const where: Prisma.InventoryReceiptWhereInput = {}
    if (filter.receiptType) where.receiptType = filter.receiptType
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
        { deliverer: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryReceipt.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.inventoryReceipt.count({ where }),
    ])

    return {
      data: rows.map(toReceiptDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const receipt = await this.prisma.inventoryReceipt.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!receipt) throw new NotFoundException(`Không tìm thấy phiếu nhập kho ${id}`)
    return toReceiptDto(receipt)
  }

  // Xem trước số phiếu nhập kế tiếp để hiển thị trên form — KHÔNG giữ chỗ;
  // số chính thức vẫn cấp lại trong transaction lúc create (tránh trùng khi ghi đồng thời).
  async previewNextVoucherNo() {
    const voucherNo = await nextVoucherNo(this.prisma)
    return { voucherNo }
  }

  async create(dto: CreateInventoryReceiptDto) {
    await this.bookLock.assertUnlocked(dto.postingDate)
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx)
      const lines = normalizeLines(dto.receiptType, dto.lines)
      const totalAmount = computeTotal(lines)
      return tx.inventoryReceipt.create({
        data: {
          receiptType: dto.receiptType,
          voucherNo,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          partnerId: dto.partnerId ?? null,
          partnerName: dto.partnerName ?? null,
          address: dto.address ?? null,
          deliverer: dto.deliverer ?? null,
          description: dto.description ?? 'Nhập kho',
          reference: dto.reference ?? null,
          attachmentCount: dto.attachmentCount ?? 0,
          totalAmount,
          branchName: dto.branchName ?? null,
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toReceiptDto(created)
  }

  async update(id: string, dto: UpdateInventoryReceiptDto) {
    const existing = await this.prisma.inventoryReceipt.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu nhập kho ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate, dto.postingDate)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.InventoryReceiptUpdateInput = {
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        partnerId: dto.partnerId ?? undefined,
        partnerName: dto.partnerName ?? undefined,
        address: dto.address ?? undefined,
        deliverer: dto.deliverer ?? undefined,
        description: dto.description ?? undefined,
        reference: dto.reference ?? undefined,
        attachmentCount: dto.attachmentCount ?? undefined,
        branchName: dto.branchName ?? undefined,
      }

      if (dto.lines) {
        // Ghi lại dòng: xóa hết dòng cũ rồi tạo lại + tính lại tổng tiền.
        const lines = normalizeLines(existing.receiptType, dto.lines)
        data.totalAmount = computeTotal(lines)
        await tx.inventoryReceiptLine.deleteMany({ where: { receiptId: id } })
        data.lines = { create: lines }
      }

      return tx.inventoryReceipt.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toReceiptDto(updated)
  }

  // Nhập khẩu phiếu nhập kho từ file Excel (mức tổng hợp). Bỏ qua số chứng từ trùng.
  async importXlsx(buffer: Buffer) {
    const parsed = parseReceiptXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.inventoryReceipt.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))
    const lockDate = await this.bookLock.getLockDate()
    const lookup = await buildPartnerLookup(this.prisma)

    const receipts: Prisma.InventoryReceiptCreateManyInput[] = []
    const lines: Prisma.InventoryReceiptLineCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      if (lockDate && p.date <= lockDate) continue // kỳ đã khóa sổ → bỏ qua như dòng trùng
      seen.add(p.voucherNo) // chống trùng trong chính file

      const total = new Prisma.Decimal(p.totalAmount)
      const id = randomUUID()
      // Nhập kho mua hàng: tên NCC nằm trong diễn giải "Mua hàng của <NCC> theo hóa đơn số X".
      const supplierName = supplierFromDescription(p.description)
      const supplier = lookup.supplier(supplierName)
      receipts.push({
        id,
        receiptType: p.receiptType,
        voucherNo: p.voucherNo,
        postingDate: p.date,
        voucherDate: p.date,
        partnerId: supplier?.id ?? null,
        partnerName: supplier?.name ?? supplierName,
        deliverer: p.deliverer,
        description: p.description ?? 'Nhập kho',
        totalAmount: total,
        branchName: p.branchName,
      })
      // Mức tổng hợp không có dòng hàng chi tiết → 1 dòng đại diện theo định khoản mặc định.
      lines.push({
        id: randomUUID(),
        receiptId: id,
        lineNo: 1,
        debitAccount: defaultDebitAccount(p.receiptType),
        creditAccount: defaultCreditAccount(p.receiptType),
        quantity: new Prisma.Decimal(1),
        unitPrice: total,
        amount: total,
      })
    }

    // Chèn theo lô để tránh statement quá lớn.
    const chunk = 500
    for (let i = 0; i < receipts.length; i += chunk) {
      await this.prisma.inventoryReceipt.createMany({ data: receipts.slice(i, i + chunk) })
    }
    for (let i = 0; i < lines.length; i += chunk) {
      await this.prisma.inventoryReceiptLine.createMany({ data: lines.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: receipts.length, skipped: parsed.length - receipts.length }
  }

  // Ghi sổ / bỏ ghi: chỉ đổi cờ posted (không đụng dòng hàng tiền). Bỏ ghi =
  // đưa về nháp → loại khỏi nhật ký chung + báo cáo tồn kho. Kỳ đã khóa sổ thì không cho đổi.
  async setPosted(id: string, posted: boolean) {
    const existing = await this.prisma.inventoryReceipt.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu nhập kho ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    const updated = await this.prisma.inventoryReceipt.update({
      where: { id },
      data: { posted },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    return toReceiptDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.inventoryReceipt.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy phiếu nhập kho ${id}`)
    await this.bookLock.assertUnlocked(existing.postingDate)
    await this.prisma.inventoryReceipt.delete({ where: { id } })
    return { id }
  }

  // ── Phiếu nhập tự sinh từ chứng từ mua hàng nhập kho (receiptType PURCHASE) ─
  // Public API cho PurchaseModule: chạy trong transaction phía gọi. Chứng từ mua
  // chưa thanh toán mang số NK → phiếu nhập dùng CHUNG số đó (MISA: chứng từ mua
  // nhập kho kiêm phiếu nhập, khớp dữ liệu nhập khẩu + luật khử trùng report);
  // trả ngay (số PC/UNC) → phiếu nhập nhận số NK kế tiếp riêng.

  async createPurchaseReceipt(
    tx: Prisma.TransactionClient,
    input: PurchaseReceiptInput,
    presetVoucherNo?: string,
  ) {
    const voucherNo = presetVoucherNo ?? (await nextVoucherNo(tx))
    const lines = purchaseReceiptLines(input)
    const created = await tx.inventoryReceipt.create({
      data: {
        receiptType: InventoryReceiptType.PURCHASE,
        voucherNo,
        ...purchaseReceiptData(input, lines),
        lines: { create: lines },
      },
      select: { id: true },
    })
    return created.id
  }

  // Đồng bộ phiếu nhập theo chứng từ mua khi sửa; đã bị xóa tay → tạo lại (id mới).
  async upsertPurchaseReceipt(
    tx: Prisma.TransactionClient,
    receiptId: string | null,
    input: PurchaseReceiptInput,
    presetVoucherNo?: string,
  ) {
    if (receiptId) {
      const existing = await tx.inventoryReceipt.findUnique({
        where: { id: receiptId },
        select: { id: true },
      })
      if (existing) {
        const lines = purchaseReceiptLines(input)
        await tx.inventoryReceiptLine.deleteMany({ where: { receiptId } })
        await tx.inventoryReceipt.update({
          where: { id: receiptId },
          data: { ...purchaseReceiptData(input, lines), lines: { create: lines } },
        })
        return receiptId
      }
    }
    return this.createPurchaseReceipt(tx, input, presetVoucherNo)
  }

  // deleteMany/updateMany + điều kiện receiptType: không nổ nếu phiếu đã bị xóa
  // tay, và không cho chứng từ mua đụng nhầm phiếu nhập tay loại khác.
  async deletePurchaseReceipt(tx: Prisma.TransactionClient, receiptId: string) {
    await tx.inventoryReceipt.deleteMany({
      where: { id: receiptId, receiptType: InventoryReceiptType.PURCHASE },
    })
  }

  async setPurchaseReceiptPosted(
    tx: Prisma.TransactionClient,
    receiptId: string,
    posted: boolean,
  ) {
    await tx.inventoryReceipt.updateMany({
      where: { id: receiptId, receiptType: InventoryReceiptType.PURCHASE },
      data: { posted },
    })
  }

  async findVoucherNo(id: string) {
    const r = await this.prisma.inventoryReceipt.findUnique({
      where: { id },
      select: { voucherNo: true },
    })
    return r?.voucherNo ?? null
  }
}

// Dữ liệu phiếu nhập tự sinh — dòng hàng mirror chứng từ mua (định khoản Nợ TK
// kho / Có TK công nợ-quỹ đã nằm ở purchase_voucher_lines; report khử trùng).
export type PurchaseReceiptInput = {
  postingDate: Date
  voucherDate: Date
  supplierId: string | null
  supplierName: string | null
  address: string | null
  deliverer: string | null
  description: string
  reference: string | null // số chứng từ mua gốc
  posted: boolean
  lines: {
    itemId: string | null
    itemName: string | null
    warehouseId: string | null
    debitAccount: string | null
    creditAccount: string | null
    unit: string | null
    quantity: Prisma.Decimal
    unitPrice: Prisma.Decimal
    amount: Prisma.Decimal
  }[]
}

function purchaseReceiptData(
  input: PurchaseReceiptInput,
  lines: ReturnType<typeof purchaseReceiptLines>,
) {
  return {
    postingDate: input.postingDate,
    voucherDate: input.voucherDate,
    partnerId: input.supplierId,
    partnerName: input.supplierName,
    address: input.address,
    deliverer: input.deliverer,
    description: input.description,
    reference: input.reference,
    posted: input.posted,
    totalAmount: computeTotal(lines),
  }
}

function purchaseReceiptLines(input: PurchaseReceiptInput) {
  return input.lines.map((l, i) => ({
    lineNo: i + 1,
    itemId: l.itemId,
    itemName: l.itemName,
    warehouseId: l.warehouseId,
    debitAccount: l.debitAccount || defaultDebitAccount(InventoryReceiptType.PURCHASE),
    creditAccount: l.creditAccount || defaultCreditAccount(InventoryReceiptType.PURCHASE),
    unit: l.unit,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    amount: l.amount,
  }))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Định khoản TK Nợ (kho) mặc định theo loại phiếu:
//   mua hàng/hàng bán trả lại → 156; thành phẩm SX → 155; khác → 152.
function defaultDebitAccount(type: InventoryReceiptType): string {
  switch (type) {
    case InventoryReceiptType.FINISHED_GOODS:
      return CHART_OF_ACCOUNTS.FINISHED_GOODS
    case InventoryReceiptType.PURCHASE:
    case InventoryReceiptType.SALES_RETURN:
      return CHART_OF_ACCOUNTS.GOODS
    default:
      return CHART_OF_ACCOUNTS.MATERIAL
  }
}

// Định khoản TK Có (đối ứng) mặc định theo loại phiếu:
//   mua hàng → 331; thành phẩm SX → 154; hàng bán trả lại → 632; khác → tự nhập.
function defaultCreditAccount(type: InventoryReceiptType): string | null {
  switch (type) {
    case InventoryReceiptType.PURCHASE:
      return CHART_OF_ACCOUNTS.PAYABLE
    case InventoryReceiptType.FINISHED_GOODS:
      return CHART_OF_ACCOUNTS.WIP
    case InventoryReceiptType.SALES_RETURN:
      return CHART_OF_ACCOUNTS.COGS
    default:
      return null
  }
}

// Trích tên NCC từ diễn giải nhập kho mua hàng: "Mua hàng của <NCC> theo hóa đơn số X".
function supplierFromDescription(desc: string | null): string | null {
  if (!desc) return null
  const m = desc.match(/Mua hàng của\s+(.+?)\s+theo hóa đơn/i)
  return m ? m[1]!.trim() : null
}

function normalizeLines(type: InventoryReceiptType, lines: CreateInventoryReceiptLineDto[]) {
  return lines.map((line, i) => {
    const quantity = new Prisma.Decimal(line.quantity)
    const unitPrice = new Prisma.Decimal(line.unitPrice)
    return {
      lineNo: i + 1,
      itemId: line.itemId ?? null,
      itemName: line.itemName ?? null,
      warehouseId: line.warehouseId ?? null,
      debitAccount: line.debitAccount || defaultDebitAccount(type),
      creditAccount: line.creditAccount || defaultCreditAccount(type),
      unit: line.unit ?? null,
      quantity,
      unitPrice,
      amount: quantity.mul(unitPrice),
      lotNo: line.lotNo ?? null,
      expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
    }
  })
}

// Tổng tiền = Σ thành tiền các dòng.
function computeTotal(lines: { amount: Prisma.Decimal }[]): Prisma.Decimal {
  return lines.reduce((s, l) => s.add(l.amount), new Prisma.Decimal(0))
}

// Số chứng từ auto tăng: NK##### chạy toàn cục, không kèm năm (vd NK07099).
// Lấy MAX(số) hiện có + 1 (không dùng count để tránh trùng khi dữ liệu nhập khẩu đứt quãng).
async function nextVoucherNo(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.inventoryReceipt.findFirst({
    where: { voucherNo: { startsWith: 'NK' } },
    orderBy: { voucherNo: 'desc' },
    select: { voucherNo: true },
  })
  const lastSeq = last ? Number(last.voucherNo.replace(/\D/g, '')) : 0
  const seq = Number.isFinite(lastSeq) ? lastSeq : 0
  return `NK${String(seq + 1).padStart(5, '0')}`
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function toReceiptDto(r: ReceiptWithLines) {
  return {
    id: r.id,
    receiptType: r.receiptType,
    voucherNo: r.voucherNo,
    postingDate: toDateOnly(r.postingDate)!,
    voucherDate: toDateOnly(r.voucherDate)!,
    partnerId: r.partnerId,
    partnerName: r.partnerName,
    address: r.address,
    deliverer: r.deliverer,
    description: r.description,
    reference: r.reference,
    attachmentCount: r.attachmentCount,
    totalAmount: r.totalAmount.toString(),
    branchName: r.branchName,
    posted: r.posted,
    lines: r.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      itemId: l.itemId,
      itemName: l.itemName,
      warehouseId: l.warehouseId,
      debitAccount: l.debitAccount,
      creditAccount: l.creditAccount,
      unit: l.unit,
      quantity: l.quantity.toString(),
      unitPrice: l.unitPrice.toString(),
      amount: l.amount.toString(),
      lotNo: l.lotNo,
      expiryDate: toDateOnly(l.expiryDate),
    })),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
