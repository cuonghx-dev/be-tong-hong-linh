import type { FixedAssetTotals, Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { FixedAssetStatus, Prisma, type FixedAsset } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto'
import { FixedAssetFilterDto } from './dto/fixed-asset-filter.dto'
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto'
import { parseFixedAssetXlsx } from './fixed-asset-import'

type ListResult = Paginated<ReturnType<typeof toAssetDto>> & { totals: FixedAssetTotals }

@Injectable()
export class FixedAssetService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: FixedAssetFilterDto): Promise<ListResult> {
    const where: Prisma.FixedAssetWhereInput = {}
    if (filter.assetType) where.assetType = filter.assetType
    if (filter.status) where.status = filter.status
    if (filter.fromDate || filter.toDate) {
      where.increaseDate = {}
      if (filter.fromDate) where.increaseDate.gte = new Date(filter.fromDate)
      if (filter.toDate) where.increaseDate.lte = new Date(filter.toDate)
    }
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { department: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total, agg] = await this.prisma.$transaction([
      this.prisma.fixedAsset.findMany({
        where,
        // Ghi tăng: mới nhất lên đầu (theo ngày ghi tăng); Sổ tài sản: theo mã tài sản.
        orderBy:
          filter.orderBy === 'increaseDate'
            ? [{ increaseDate: 'desc' }, { createdAt: 'desc' }]
            : [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.fixedAsset.count({ where }),
      // Tổng cộng toàn bộ tập đã lọc (dòng "Tổng" cuối Sổ tài sản), không chỉ trang hiện tại.
      this.prisma.fixedAsset.aggregate({
        where,
        _sum: {
          usefulLifeMonths: true,
          remainingMonths: true,
          originalCost: true,
          depreciableValue: true,
          accumulatedDepreciation: true,
          residualValue: true,
          monthlyDepreciation: true,
        },
      }),
    ])

    const s = agg._sum
    const totals: FixedAssetTotals = {
      usefulLifeMonths: s.usefulLifeMonths ?? 0,
      remainingMonths: s.remainingMonths ?? 0,
      originalCost: (s.originalCost ?? new Prisma.Decimal(0)).toString(),
      depreciableValue: (s.depreciableValue ?? new Prisma.Decimal(0)).toString(),
      accumulatedDepreciation: (s.accumulatedDepreciation ?? new Prisma.Decimal(0)).toString(),
      residualValue: (s.residualValue ?? new Prisma.Decimal(0)).toString(),
      monthlyDepreciation: (s.monthlyDepreciation ?? new Prisma.Decimal(0)).toString(),
    }

    return {
      data: rows.map(toAssetDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
      totals,
    }
  }

  async findOne(id: string) {
    const asset = await this.prisma.fixedAsset.findUnique({ where: { id } })
    if (!asset) throw new NotFoundException(`Không tìm thấy tài sản ${id}`)
    return toAssetDto(asset)
  }

  async create(dto: CreateFixedAssetDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const dup = await tx.fixedAsset.findUnique({ where: { code: dto.code } })
      if (dup) throw new ConflictException(`Mã tài sản "${dto.code}" đã tồn tại`)
      // Số chứng từ ghi tăng tự sinh theo năm ghi tăng (GTTS##/YYYY).
      const year = (dto.increaseDate ? new Date(dto.increaseDate) : new Date()).getFullYear()
      const voucherNo = await nextVoucherNo(tx, year)
      return tx.fixedAsset.create({ data: { voucherNo, ...toCreateData(dto) } })
    })
    return toAssetDto(created)
  }

  async update(id: string, dto: UpdateFixedAssetDto) {
    const existing = await this.prisma.fixedAsset.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài sản ${id}`)
    const updated = await this.prisma.fixedAsset.update({ where: { id }, data: toUpdateData(dto) })
    return toAssetDto(updated)
  }

  // Nhập khẩu Sổ tài sản / Danh sách ghi tăng từ file Excel.
  // Bỏ qua trùng mã tài sản HOẶC trùng số chứng từ ghi tăng (voucherNo).
  async importXlsx(buffer: Buffer) {
    const parsed = parseFixedAssetXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const voucherNos = parsed.map((p) => p.voucherNo).filter((v): v is string => !!v)
    const existing = await this.prisma.fixedAsset.findMany({
      where: { OR: [{ code: { in: codes } }, { voucherNo: { in: voucherNos } }] },
      select: { code: true, voucherNo: true },
    })
    const seenCodes = new Set(existing.map((e) => e.code))
    const seenVouchers = new Set(existing.map((e) => e.voucherNo).filter((v): v is string => !!v))

    // Bộ đếm số chứng từ ghi tăng theo năm — seed từ MAX seq hiện có trong DB.
    // Dùng khi file không có cột "Số chứng từ" (mẫu Sổ tài sản) → tự sinh GTTS##/YYYY.
    const counters = await this.seedVoucherCounters()
    const genVoucher = (date: Date | null): string => {
      const yr = (date ?? new Date()).getFullYear()
      const next = (counters.get(yr) ?? 0) + 1
      counters.set(yr, next)
      return `GTTS${String(next).padStart(2, '0')}/${yr}`
    }

    const assets: Prisma.FixedAssetCreateManyInput[] = []
    for (const p of parsed) {
      if (seenCodes.has(p.code) || (p.voucherNo && seenVouchers.has(p.voucherNo))) continue
      seenCodes.add(p.code) // chống trùng trong chính file
      const voucherNo = p.voucherNo ?? genVoucher(p.increaseDate)
      seenVouchers.add(voucherNo)
      assets.push({
        id: randomUUID(),
        voucherNo,
        code: p.code,
        name: p.name,
        assetType: p.assetType,
        department: p.department,
        increaseDate: p.increaseDate,
        depreciationStartDate: p.depreciationStartDate,
        usefulLifeMonths: p.usefulLifeMonths,
        remainingMonths: p.remainingMonths,
        originalCost: new Prisma.Decimal(p.originalCost),
        depreciableValue: new Prisma.Decimal(p.depreciableValue),
        accumulatedDepreciation: new Prisma.Decimal(p.accumulatedDepreciation),
        residualValue: new Prisma.Decimal(p.residualValue),
        monthlyDepreciation: new Prisma.Decimal(p.monthlyDepreciation),
        costAccount: p.costAccount,
        depreciationAccount: p.depreciationAccount,
        status: p.status,
      })
    }

    const chunk = 500
    for (let i = 0; i < assets.length; i += chunk) {
      await this.prisma.fixedAsset.createMany({ data: assets.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: assets.length, skipped: parsed.length - assets.length }
  }

  // Seed bộ đếm số chứng từ ghi tăng theo năm (year → MAX seq) từ dữ liệu hiện có.
  private async seedVoucherCounters(): Promise<Map<number, number>> {
    const rows = await this.prisma.fixedAsset.findMany({
      where: { voucherNo: { startsWith: 'GTTS' } },
      select: { voucherNo: true },
    })
    const counters = new Map<number, number>()
    for (const { voucherNo } of rows) {
      const m = voucherNo?.match(/GTTS(\d+)\/(\d+)/)
      if (!m) continue
      const yr = Number(m[2])
      counters.set(yr, Math.max(counters.get(yr) ?? 0, Number(m[1])))
    }
    return counters
  }

  async remove(id: string) {
    const existing = await this.prisma.fixedAsset.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy tài sản ${id}`)
    await this.prisma.fixedAsset.delete({ where: { id } })
    return { id }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Giá trị dẫn xuất: giá trị còn lại = nguyên giá − hao mòn lũy kế;
// giá trị KH tháng = giá trị tính KH ÷ thời gian sử dụng (làm tròn về đồng).
function derive(input: {
  originalCost: number
  depreciableValue: number
  accumulatedDepreciation: number
  usefulLifeMonths: number
}) {
  const originalCost = new Prisma.Decimal(input.originalCost)
  const depreciableValue = new Prisma.Decimal(input.depreciableValue)
  const accumulatedDepreciation = new Prisma.Decimal(input.accumulatedDepreciation)
  const residualValue = originalCost.sub(accumulatedDepreciation)
  const monthlyDepreciation =
    input.usefulLifeMonths > 0
      ? depreciableValue.div(input.usefulLifeMonths).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0)
  return { originalCost, depreciableValue, accumulatedDepreciation, residualValue, monthlyDepreciation }
}

function toCreateData(dto: CreateFixedAssetDto): Omit<Prisma.FixedAssetCreateInput, 'voucherNo'> {
  const usefulLifeMonths = dto.usefulLifeMonths ?? 0
  const d = derive({
    originalCost: dto.originalCost ?? 0,
    // Giá trị tính KH mặc định = nguyên giá khi không nhập riêng.
    depreciableValue: dto.depreciableValue ?? dto.originalCost ?? 0,
    accumulatedDepreciation: dto.accumulatedDepreciation ?? 0,
    usefulLifeMonths,
  })
  return {
    code: dto.code,
    name: dto.name,
    assetType: dto.assetType ?? null,
    department: dto.department ?? null,
    description: dto.description ?? null,
    attachmentCount: dto.attachmentCount ?? 0,
    increaseDate: dto.increaseDate ? new Date(dto.increaseDate) : null,
    depreciationStartDate: dto.depreciationStartDate ? new Date(dto.depreciationStartDate) : null,
    usefulLifeMonths,
    // Ghi tăng = tài sản mới → thời gian còn lại mặc định = thời gian sử dụng.
    remainingMonths: dto.remainingMonths ?? usefulLifeMonths,
    ...d,
    costAccount: dto.costAccount ?? null,
    depreciationAccount: dto.depreciationAccount ?? null,
    status: dto.status ?? FixedAssetStatus.IN_USE,
  }
}

function toUpdateData(dto: UpdateFixedAssetDto): Prisma.FixedAssetUpdateInput {
  const data: Prisma.FixedAssetUpdateInput = {
    name: dto.name ?? undefined,
    assetType: dto.assetType ?? undefined,
    department: dto.department ?? undefined,
    description: dto.description ?? undefined,
    attachmentCount: dto.attachmentCount ?? undefined,
    increaseDate: dto.increaseDate ? new Date(dto.increaseDate) : undefined,
    depreciationStartDate: dto.depreciationStartDate
      ? new Date(dto.depreciationStartDate)
      : undefined,
    usefulLifeMonths: dto.usefulLifeMonths ?? undefined,
    remainingMonths: dto.remainingMonths ?? undefined,
    costAccount: dto.costAccount ?? undefined,
    depreciationAccount: dto.depreciationAccount ?? undefined,
    status: dto.status ?? undefined,
  }
  // Nếu đụng tới bất kỳ trường tiền/thời gian nào → tính lại nhóm giá trị dẫn xuất.
  const touchesMoney =
    dto.originalCost !== undefined ||
    dto.depreciableValue !== undefined ||
    dto.accumulatedDepreciation !== undefined ||
    dto.usefulLifeMonths !== undefined
  if (touchesMoney) {
    Object.assign(
      data,
      derive({
        originalCost: dto.originalCost ?? 0,
        depreciableValue: dto.depreciableValue ?? dto.originalCost ?? 0,
        accumulatedDepreciation: dto.accumulatedDepreciation ?? 0,
        usefulLifeMonths: dto.usefulLifeMonths ?? 0,
      }),
    )
  }
  return data
}

// Số chứng từ ghi tăng auto tăng theo năm: GTTS##/YYYY (vd GTTS05/2026).
// Lấy MAX(seq trong năm) + 1 — không dùng count để tránh trùng khi dữ liệu nhập khẩu đứt quãng.
async function nextVoucherNo(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const rows = await tx.fixedAsset.findMany({
    where: { voucherNo: { startsWith: 'GTTS', endsWith: `/${year}` } },
    select: { voucherNo: true },
  })
  const maxSeq = rows.reduce((m, r) => {
    const seq = Number(r.voucherNo?.match(/GTTS(\d+)\//)?.[1] ?? 0)
    return seq > m ? seq : m
  }, 0)
  return `GTTS${String(maxSeq + 1).padStart(2, '0')}/${year}`
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function toAssetDto(a: FixedAsset) {
  return {
    id: a.id,
    voucherNo: a.voucherNo,
    code: a.code,
    name: a.name,
    assetType: a.assetType,
    department: a.department,
    description: a.description,
    attachmentCount: a.attachmentCount,
    increaseDate: toDateOnly(a.increaseDate),
    depreciationStartDate: toDateOnly(a.depreciationStartDate),
    usefulLifeMonths: a.usefulLifeMonths,
    remainingMonths: a.remainingMonths,
    originalCost: a.originalCost.toString(),
    depreciableValue: a.depreciableValue.toString(),
    accumulatedDepreciation: a.accumulatedDepreciation.toString(),
    residualValue: a.residualValue.toString(),
    monthlyDepreciation: a.monthlyDepreciation.toString(),
    costAccount: a.costAccount,
    depreciationAccount: a.depreciationAccount,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}
