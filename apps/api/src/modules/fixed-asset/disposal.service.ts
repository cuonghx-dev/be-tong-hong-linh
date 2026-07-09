import { CHART_OF_ACCOUNTS, type Paginated } from '@app/shared'
import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  FixedAssetStatus,
  Prisma,
  type FixedAssetDisposal,
  type FixedAssetDisposalLine,
} from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { parseDisposalXlsx } from './disposal-import'
import { CreateDisposalDto, CreateDisposalLineDto } from './dto/create-disposal.dto'
import { DisposalFilterDto } from './dto/disposal-filter.dto'
import { UpdateDisposalDto } from './dto/update-disposal.dto'

type DisposalWithLines = FixedAssetDisposal & { lines: FixedAssetDisposalLine[] }

@Injectable()
export class DisposalService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: DisposalFilterDto): Promise<Paginated<ReturnType<typeof toDisposalDto>>> {
    const where: Prisma.FixedAssetDisposalWhereInput = {}
    if (filter.fromDate || filter.toDate) {
      where.postingDate = {}
      if (filter.fromDate) where.postingDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.postingDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { voucherNo: { contains: filter.keyword, mode: 'insensitive' } },
        { reason: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fixedAssetDisposal.findMany({
        where,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
        orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.fixedAssetDisposal.count({ where }),
    ])

    return {
      data: rows.map(toDisposalDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const row = await this.prisma.fixedAssetDisposal.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!row) throw new NotFoundException(`Không tìm thấy chứng từ ghi giảm ${id}`)
    return toDisposalDto(row)
  }

  async create(dto: CreateDisposalDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const voucherNo = await nextVoucherNo(tx, new Date(dto.voucherDate))
      const lines = normalizeLines(dto.lines)
      const totals = sumTotals(lines)
      const row = await tx.fixedAssetDisposal.create({
        data: {
          voucherNo,
          postingDate: new Date(dto.postingDate),
          voucherDate: new Date(dto.voucherDate),
          reason: dto.reason ?? null,
          ...totals,
          lines: { create: lines },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
      // Ghi giảm → đánh dấu thẻ TSCD "Ngừng sử dụng".
      await setAssetStatus(tx, assetIds(lines), FixedAssetStatus.SUSPENDED)
      return row
    })
    return toDisposalDto(created)
  }

  async update(id: string, dto: UpdateDisposalDto) {
    const existing = await this.prisma.fixedAssetDisposal.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ghi giảm ${id}`)

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.FixedAssetDisposalUpdateInput = {
        postingDate: dto.postingDate ? new Date(dto.postingDate) : undefined,
        voucherDate: dto.voucherDate ? new Date(dto.voucherDate) : undefined,
        reason: dto.reason ?? undefined,
      }

      if (dto.lines) {
        const lines = normalizeLines(dto.lines)
        Object.assign(data, sumTotals(lines))
        await tx.fixedAssetDisposalLine.deleteMany({ where: { disposalId: id } })
        data.lines = { create: lines }
        // Thẻ cũ hết bị ghi giảm → khôi phục "Đang sử dụng"; thẻ mới → "Ngừng sử dụng".
        await setAssetStatus(
          tx,
          existing.lines.map((l) => l.assetId).filter((x): x is string => !!x),
          FixedAssetStatus.IN_USE,
        )
        await setAssetStatus(tx, assetIds(lines), FixedAssetStatus.SUSPENDED)
      }

      return tx.fixedAssetDisposal.update({
        where: { id },
        data,
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      })
    })
    return toDisposalDto(updated)
  }

  async remove(id: string) {
    const existing = await this.prisma.fixedAssetDisposal.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!existing) throw new NotFoundException(`Không tìm thấy chứng từ ghi giảm ${id}`)

    await this.prisma.$transaction(async (tx) => {
      await tx.fixedAssetDisposal.delete({ where: { id } })
      // Xóa chứng từ ghi giảm → khôi phục thẻ TSCD về "Đang sử dụng".
      await setAssetStatus(
        tx,
        existing.lines.map((l) => l.assetId).filter((x): x is string => !!x),
        FixedAssetStatus.IN_USE,
      )
    })
    return { id }
  }

  // Nhập khẩu từ file Excel Danh sách ghi giảm — bỏ qua chứng từ trùng số (header-only).
  async importXlsx(buffer: Buffer) {
    const parsed = parseDisposalXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const nos = parsed.map((p) => p.voucherNo)
    const existing = await this.prisma.fixedAssetDisposal.findMany({
      where: { voucherNo: { in: nos } },
      select: { voucherNo: true },
    })
    const seen = new Set(existing.map((e) => e.voucherNo))

    const rows: Prisma.FixedAssetDisposalCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.voucherNo)) continue
      seen.add(p.voucherNo)
      rows.push({
        id: randomUUID(),
        voucherNo: p.voucherNo,
        postingDate: p.postingDate,
        voucherDate: p.voucherDate,
        reason: p.reason,
      })
    }

    const chunk = 500
    for (let i = 0; i < rows.length; i += chunk) {
      await this.prisma.fixedAssetDisposal.createMany({ data: rows.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: rows.length, skipped: parsed.length - rows.length }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Bút toán ghi giảm (nhượng bán/thanh lý): Nợ 2141 (hao mòn) + 811 (giá trị còn lại) / Có 211x.
function normalizeLines(lines: CreateDisposalLineDto[]) {
  return lines.map((line, i) => ({
    lineNo: i + 1,
    assetId: line.assetId ?? null,
    assetCode: line.assetCode ?? null,
    assetName: line.assetName ?? null,
    originalCost: new Prisma.Decimal(line.originalCost ?? 0),
    accumulatedDepreciation: new Prisma.Decimal(line.accumulatedDepreciation ?? 0),
    residualValue: new Prisma.Decimal(line.residualValue ?? 0),
    debitAccount: line.debitAccount || CHART_OF_ACCOUNTS.FIXED_ASSET_DEPRECIATION,
    creditAccount: line.creditAccount || CHART_OF_ACCOUNTS.FIXED_ASSET,
  }))
}

function sumTotals(lines: ReturnType<typeof normalizeLines>) {
  const zero = new Prisma.Decimal(0)
  return {
    totalOriginalCost: lines.reduce((s, l) => s.add(l.originalCost), zero),
    totalAccumulated: lines.reduce((s, l) => s.add(l.accumulatedDepreciation), zero),
    totalResidual: lines.reduce((s, l) => s.add(l.residualValue), zero),
  }
}

function assetIds(lines: { assetId: string | null }[]): string[] {
  return lines.map((l) => l.assetId).filter((x): x is string => !!x)
}

async function setAssetStatus(
  tx: Prisma.TransactionClient,
  ids: string[],
  status: FixedAssetStatus,
) {
  if (ids.length === 0) return
  await tx.fixedAsset.updateMany({ where: { id: { in: ids } }, data: { status } })
}

// Số chứng từ ghi giảm: GGTS##/YYYY — MAX(seq trong năm) + 1 (không dùng count).
async function nextVoucherNo(tx: Prisma.TransactionClient, voucherDate: Date): Promise<string> {
  const year = voucherDate.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const rows = await tx.fixedAssetDisposal.findMany({
    where: { voucherDate: { gte: yearStart, lt: yearEnd } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((max, r) => {
    const digits = r.voucherNo.split('/')[0]?.replace(/\D/g, '') ?? ''
    const n = Number.parseInt(digits, 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 0)
  const seq = String(maxSeq + 1).padStart(2, '0')
  return `GGTS${seq}/${year}`
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toDisposalDto(v: DisposalWithLines) {
  return {
    id: v.id,
    voucherNo: v.voucherNo,
    postingDate: toDateOnly(v.postingDate),
    voucherDate: toDateOnly(v.voucherDate),
    reason: v.reason,
    totalOriginalCost: v.totalOriginalCost.toString(),
    totalAccumulated: v.totalAccumulated.toString(),
    totalResidual: v.totalResidual.toString(),
    lines: v.lines.map((l) => ({
      id: l.id,
      lineNo: l.lineNo,
      assetId: l.assetId,
      assetCode: l.assetCode,
      assetName: l.assetName,
      originalCost: l.originalCost.toString(),
      accumulatedDepreciation: l.accumulatedDepreciation.toString(),
      residualValue: l.residualValue.toString(),
      debitAccount: l.debitAccount,
      creditAccount: l.creditAccount,
    })),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}
