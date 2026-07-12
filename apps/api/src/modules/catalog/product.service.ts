import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Product } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductFilterDto } from './dto/product-filter.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { parseProductXlsx } from './product-import'

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ProductFilterDto): Promise<Paginated<ReturnType<typeof toProductDto>>> {
    const where: Prisma.ProductWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.type) where.type = filter.type
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { groupCode: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      data: rows.map(toProductDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } })
    if (!product) throw new NotFoundException(`Không tìm thấy hàng hóa ${id}`)
    return toProductDto(product)
  }

  async create(dto: CreateProductDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.product.create({ data: toCreateData(dto) })
    return toProductDto(created)
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy hàng hóa ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        groupCode: dto.groupCode ?? undefined,
        unit: dto.unit ?? undefined,
        description: dto.description ?? undefined,
        purchaseDescription: dto.purchaseDescription ?? undefined,
        saleDescription: dto.saleDescription ?? undefined,
        defaultWarehouseCode: dto.defaultWarehouseCode ?? undefined,
        defaultWarehouseName: dto.defaultWarehouseName ?? undefined,
        inventoryAccount: dto.inventoryAccount ?? undefined,
        revenueAccount: dto.revenueAccount ?? undefined,
        discountAccount: dto.discountAccount ?? undefined,
        saleReturnAccount: dto.saleReturnAccount ?? undefined,
        costAccount: dto.costAccount ?? undefined,
        purchasePrice: dto.purchasePrice ?? undefined,
        salePrice: dto.salePrice ?? undefined,
        minStock: dto.minStock ?? undefined,
        vatRate: dto.vatRate ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toProductDto(updated)
  }

  // Nhập khẩu hàng hóa từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseProductXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.product.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.ProductCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        type: p.type,
        groupCode: p.groupCode,
        unit: p.unit,
        description: p.description,
        purchaseDescription: p.purchaseDescription,
        saleDescription: p.saleDescription,
        defaultWarehouseCode: p.defaultWarehouseCode,
        defaultWarehouseName: p.defaultWarehouseName,
        inventoryAccount: p.inventoryAccount,
        revenueAccount: p.revenueAccount,
        discountAccount: p.discountAccount,
        saleReturnAccount: p.saleReturnAccount,
        costAccount: p.costAccount,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        minStock: p.minStock,
        vatRate: p.vatRate,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.product.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy hàng hóa ${id}`)
    // Hàng hóa có thể được gắn vào dòng chứng từ (itemId dạng tham chiếu lỏng).
    const counts = await this.prisma.$transaction([
      this.prisma.purchaseVoucherLine.count({ where: { itemId: id } }),
      this.prisma.salesVoucherLine.count({ where: { itemId: id } }),
      this.prisma.inventoryReceiptLine.count({ where: { itemId: id } }),
      this.prisma.goodsIssueLine.count({ where: { itemId: id } }),
    ])
    const usedBy = counts.reduce((sum, n) => sum + n, 0)
    if (usedBy > 0) {
      throw new ConflictException(`Hàng hóa đang gắn với ${usedBy} dòng chứng từ, không thể xóa`)
    }
    await this.prisma.product.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.product.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã hàng hóa "${code}" đã tồn tại`)
  }
}

function toCreateData(dto: CreateProductDto): Prisma.ProductCreateInput {
  return {
    code: dto.code,
    name: dto.name,
    type: dto.type ?? undefined,
    groupCode: dto.groupCode ?? null,
    unit: dto.unit ?? null,
    description: dto.description ?? null,
    purchaseDescription: dto.purchaseDescription ?? null,
    saleDescription: dto.saleDescription ?? null,
    defaultWarehouseCode: dto.defaultWarehouseCode ?? null,
    defaultWarehouseName: dto.defaultWarehouseName ?? null,
    inventoryAccount: dto.inventoryAccount ?? null,
    revenueAccount: dto.revenueAccount ?? null,
    discountAccount: dto.discountAccount ?? null,
    saleReturnAccount: dto.saleReturnAccount ?? null,
    costAccount: dto.costAccount ?? null,
    purchasePrice: dto.purchasePrice ?? null,
    salePrice: dto.salePrice ?? null,
    minStock: dto.minStock ?? null,
    vatRate: dto.vatRate ?? null,
    isActive: dto.isActive ?? true,
  }
}

function toProductDto(p: Product) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
    groupCode: p.groupCode,
    unit: p.unit,
    description: p.description,
    purchaseDescription: p.purchaseDescription,
    saleDescription: p.saleDescription,
    defaultWarehouseCode: p.defaultWarehouseCode,
    defaultWarehouseName: p.defaultWarehouseName,
    inventoryAccount: p.inventoryAccount,
    revenueAccount: p.revenueAccount,
    discountAccount: p.discountAccount,
    saleReturnAccount: p.saleReturnAccount,
    costAccount: p.costAccount,
    purchasePrice: p.purchasePrice?.toString() ?? null,
    salePrice: p.salePrice?.toString() ?? null,
    minStock: p.minStock?.toString() ?? null,
    vatRate: p.vatRate,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
