import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type InventoryItem } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateItemDto } from './dto/create-item.dto'
import { ItemFilterDto } from './dto/item-filter.dto'
import { UpdateItemDto } from './dto/update-item.dto'
import { parseItemXlsx } from './item-import'

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ItemFilterDto): Promise<Paginated<ReturnType<typeof toItemDto>>> {
    const where: Prisma.InventoryItemWhereInput = {}
    if (filter.nature) where.nature = filter.nature
    if (filter.groupName) where.groupName = filter.groupName
    if (filter.outOfStock) where.stockQuantity = { lte: 0 }
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.inventoryItem.count({ where }),
    ])

    return {
      data: rows.map(toItemDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException(`Không tìm thấy hàng hóa ${id}`)
    return toItemDto(item)
  }

  async create(dto: CreateItemDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.inventoryItem.create({
      data: {
        code: dto.code,
        name: dto.name,
        nature: dto.nature ?? undefined,
        taxReduction: dto.taxReduction ?? undefined,
        groupName: dto.groupName ?? null,
        unit: dto.unit ?? null,
        minStock: dto.minStock ?? 0,
        warrantyMonths: dto.warrantyMonths ?? null,
        origin: dto.origin ?? null,
        description: dto.description ?? null,
        purchaseDescription: dto.purchaseDescription ?? null,
        salesDescription: dto.salesDescription ?? null,
        defaultWarehouse: dto.defaultWarehouse ?? null,
        stockAccount: dto.stockAccount ?? null,
        revenueAccount: dto.revenueAccount ?? null,
        expenseAccount: dto.expenseAccount ?? null,
        purchasePrice: dto.purchasePrice ?? 0,
        salePrice: dto.salePrice ?? 0,
        vatRate: dto.vatRate ?? 0,
        priceAfterTax: dto.priceAfterTax ?? false,
        branchName: dto.branchName ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toItemDto(created)
  }

  async update(id: string, dto: UpdateItemDto) {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy hàng hóa ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        nature: dto.nature ?? undefined,
        taxReduction: dto.taxReduction ?? undefined,
        groupName: dto.groupName ?? undefined,
        unit: dto.unit ?? undefined,
        minStock: dto.minStock ?? undefined,
        warrantyMonths: dto.warrantyMonths ?? undefined,
        origin: dto.origin ?? undefined,
        description: dto.description ?? undefined,
        purchaseDescription: dto.purchaseDescription ?? undefined,
        salesDescription: dto.salesDescription ?? undefined,
        defaultWarehouse: dto.defaultWarehouse ?? undefined,
        stockAccount: dto.stockAccount ?? undefined,
        revenueAccount: dto.revenueAccount ?? undefined,
        expenseAccount: dto.expenseAccount ?? undefined,
        purchasePrice: dto.purchasePrice ?? undefined,
        salePrice: dto.salePrice ?? undefined,
        vatRate: dto.vatRate ?? undefined,
        priceAfterTax: dto.priceAfterTax ?? undefined,
        branchName: dto.branchName ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toItemDto(updated)
  }

  // Nhập khẩu HHDV từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseItemXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.inventoryItem.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.InventoryItemCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        nature: p.nature,
        taxReduction: p.taxReduction,
        groupName: p.groupName,
        unit: p.unit,
        stockQuantity: p.stockQuantity,
        stockValue: p.stockValue,
        minStock: p.minStock,
        warrantyMonths: p.warrantyMonths,
        origin: p.origin,
        description: p.description,
        purchaseDescription: p.purchaseDescription,
        salesDescription: p.salesDescription,
        defaultWarehouse: p.defaultWarehouse,
        stockAccount: p.stockAccount,
        revenueAccount: p.revenueAccount,
        expenseAccount: p.expenseAccount,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        vatRate: p.vatRate,
        branchName: p.branchName,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.inventoryItem.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy hàng hóa ${id}`)
    const usedBy = await this.prisma.purchaseVoucherLine.count({ where: { itemId: id } })
    if (usedBy > 0) {
      throw new ConflictException(`Hàng hóa đang gắn với ${usedBy} dòng chứng từ, không thể xóa`)
    }
    await this.prisma.inventoryItem.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.inventoryItem.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã hàng hóa "${code}" đã tồn tại`)
  }
}

function toItemDto(i: InventoryItem) {
  return {
    id: i.id,
    code: i.code,
    name: i.name,
    nature: i.nature,
    taxReduction: i.taxReduction,
    groupName: i.groupName,
    unit: i.unit,
    stockQuantity: i.stockQuantity.toString(),
    stockValue: i.stockValue.toString(),
    minStock: i.minStock.toString(),
    warrantyMonths: i.warrantyMonths,
    origin: i.origin,
    description: i.description,
    purchaseDescription: i.purchaseDescription,
    salesDescription: i.salesDescription,
    defaultWarehouse: i.defaultWarehouse,
    stockAccount: i.stockAccount,
    revenueAccount: i.revenueAccount,
    expenseAccount: i.expenseAccount,
    purchasePrice: i.purchasePrice.toString(),
    salePrice: i.salePrice.toString(),
    vatRate: i.vatRate.toString(),
    priceAfterTax: i.priceAfterTax,
    branchName: i.branchName,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }
}
