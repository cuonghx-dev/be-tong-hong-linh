import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { OrgUnitLevel, Prisma, type OrganizationUnit } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateOrganizationUnitDto } from './dto/create-organization-unit.dto'
import { OrganizationUnitFilterDto } from './dto/organization-unit-filter.dto'
import { UpdateOrganizationUnitDto } from './dto/update-organization-unit.dto'
import { parseOrganizationUnitXlsx } from './organization-unit-import'

@Injectable()
export class OrganizationUnitService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filter: OrganizationUnitFilterDto,
  ): Promise<Paginated<ReturnType<typeof toOrganizationUnitDto>>> {
    const where: Prisma.OrganizationUnitWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.level) where.level = filter.level
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { address: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.organizationUnit.findMany({
        where,
        // Công ty trước, chi nhánh rồi phòng ban; cùng cấp xếp theo mã.
        orderBy: [{ level: 'asc' }, { code: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.organizationUnit.count({ where }),
    ])

    return {
      data: rows.map(toOrganizationUnitDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id } })
    if (!unit) throw new NotFoundException(`Không tìm thấy đơn vị ${id}`)
    return toOrganizationUnitDto(unit)
  }

  async create(dto: CreateOrganizationUnitDto) {
    await this.ensureCodeFree(dto.code)
    const parentId = await this.resolveParentId(dto.parentId)
    const created = await this.prisma.organizationUnit.create({
      data: {
        code: dto.code,
        name: dto.name,
        address: dto.address ?? null,
        level: dto.level,
        parentId,
        isActive: dto.isActive ?? true,
      },
    })
    return toOrganizationUnitDto(created)
  }

  async update(id: string, dto: UpdateOrganizationUnitDto) {
    const existing = await this.prisma.organizationUnit.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy đơn vị ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    let parentId: string | null | undefined
    if (dto.parentId !== undefined) {
      parentId = await this.resolveParentId(dto.parentId)
      if (parentId) await this.ensureNoCycle(id, parentId)
    }

    const updated = await this.prisma.organizationUnit.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        address: dto.address ?? undefined,
        level: dto.level ?? undefined,
        parentId,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toOrganizationUnitDto(updated)
  }

  // Nhập khẩu cơ cấu tổ chức từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseOrganizationUnitXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.organizationUnit.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.OrganizationUnitCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        address: p.address,
        level: p.level,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.organizationUnit.createMany({ data: data.slice(i, i + chunk) })
    }

    await this.linkParentsByLevelOrder(parsed, new Set(data.map((d) => d.code)))

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.organizationUnit.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy đơn vị ${id}`)
    const children = await this.prisma.organizationUnit.count({ where: { parentId: id } })
    if (children > 0) {
      throw new ConflictException(`Đơn vị đang có ${children} đơn vị trực thuộc, không thể xóa`)
    }
    await this.prisma.organizationUnit.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.organizationUnit.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã đơn vị "${code}" đã tồn tại`)
  }

  // '' / null → null (đơn vị gốc); có giá trị → phải tồn tại.
  private async resolveParentId(parentId: string | null | undefined): Promise<string | null> {
    if (!parentId) return null
    const parent = await this.prisma.organizationUnit.findUnique({ where: { id: parentId } })
    if (!parent) throw new NotFoundException(`Không tìm thấy đơn vị cha ${parentId}`)
    return parent.id
  }

  // Chặn vòng lặp cha-con: cha mới không được là chính nó hoặc đơn vị trực thuộc nó.
  private async ensureNoCycle(id: string, newParentId: string) {
    let cursor: string | null = newParentId
    while (cursor) {
      if (cursor === id) {
        throw new ConflictException('Đơn vị cha không được là chính nó hoặc đơn vị trực thuộc nó')
      }
      const node: { parentId: string | null } | null =
        await this.prisma.organizationUnit.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        })
      cursor = node?.parentId ?? null
    }
  }

  // File nhập khẩu không có cột đơn vị cha → suy cha theo thứ tự dòng:
  // dòng cấp thấp hơn thuộc dòng cấp cao hơn gần nhất phía trên (PHÒNG BAN → CHI NHÁNH/CÔNG TY).
  private async linkParentsByLevelOrder(
    parsed: { code: string; level: OrgUnitLevel }[],
    createdCodes: Set<string>,
  ) {
    const RANK: Record<OrgUnitLevel, number> = { COMPANY: 0, BRANCH: 1, DEPARTMENT: 2 }
    const parentCodeByChild = new Map<string, string>()
    const stack: { code: string; level: OrgUnitLevel }[] = [] // các "tổ tiên" đang mở theo thứ tự dòng
    for (const row of parsed) {
      while (stack.length > 0 && RANK[stack[stack.length - 1]!.level] >= RANK[row.level]) {
        stack.pop()
      }
      const parent = stack[stack.length - 1]
      if (parent && createdCodes.has(row.code)) parentCodeByChild.set(row.code, parent.code)
      stack.push(row)
    }
    if (parentCodeByChild.size === 0) return

    const codes = [...new Set([...parentCodeByChild.keys(), ...parentCodeByChild.values()])]
    const units = await this.prisma.organizationUnit.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    })
    const idByCode = new Map(units.map((u) => [u.code, u.id]))

    const updates = [...parentCodeByChild.entries()].flatMap(([child, parent]) => {
      const parentId = idByCode.get(parent)
      if (!parentId) return []
      return this.prisma.organizationUnit.update({ where: { code: child }, data: { parentId } })
    })
    if (updates.length > 0) await this.prisma.$transaction(updates)
  }
}

function toOrganizationUnitDto(u: OrganizationUnit) {
  return {
    id: u.id,
    code: u.code,
    name: u.name,
    address: u.address,
    level: u.level,
    parentId: u.parentId,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}
