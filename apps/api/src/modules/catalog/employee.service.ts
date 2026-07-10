import { type Paginated } from '@app/shared'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type Employee } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { EmployeeFilterDto } from './dto/employee-filter.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { parseEmployeeXlsx } from './employee-import'

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: EmployeeFilterDto): Promise<Paginated<ReturnType<typeof toEmployeeDto>>> {
    const where: Prisma.EmployeeWhereInput = {}
    if (filter.isActive !== undefined) where.isActive = filter.isActive
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { title: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.employee.count({ where }),
    ])

    return {
      data: rows.map(toEmployeeDto),
      pagination: { page: filter.page, pageSize: filter.pageSize, total },
    }
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } })
    if (!employee) throw new NotFoundException(`Không tìm thấy nhân viên ${id}`)
    return toEmployeeDto(employee)
  }

  async create(dto: CreateEmployeeDto) {
    await this.ensureCodeFree(dto.code)
    const created = await this.prisma.employee.create({
      data: {
        code: dto.code,
        name: dto.name,
        title: dto.title ?? null,
        department: dto.department ?? null,
        bankAccount: dto.bankAccount ?? null,
        bankName: dto.bankName ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return toEmployeeDto(created)
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhân viên ${id}`)
    if (dto.code && dto.code !== existing.code) await this.ensureCodeFree(dto.code)

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        code: dto.code ?? undefined,
        name: dto.name ?? undefined,
        title: dto.title ?? undefined,
        department: dto.department ?? undefined,
        bankAccount: dto.bankAccount ?? undefined,
        bankName: dto.bankName ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    })
    return toEmployeeDto(updated)
  }

  // Nhập khẩu nhân viên từ Excel. Bỏ qua mã đã tồn tại (trong DB và trùng trong chính file).
  async importXlsx(buffer: Buffer) {
    const parsed = parseEmployeeXlsx(buffer)
    if (parsed.length === 0) return { total: 0, created: 0, skipped: 0 }

    const codes = parsed.map((p) => p.code)
    const existing = await this.prisma.employee.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const seen = new Set(existing.map((e) => e.code))

    const data: Prisma.EmployeeCreateManyInput[] = []
    for (const p of parsed) {
      if (seen.has(p.code)) continue
      seen.add(p.code)
      data.push({
        code: p.code,
        name: p.name,
        title: p.title,
        department: p.department,
        bankAccount: p.bankAccount,
        bankName: p.bankName,
        isActive: p.isActive,
      })
    }

    const chunk = 500
    for (let i = 0; i < data.length; i += chunk) {
      await this.prisma.employee.createMany({ data: data.slice(i, i + chunk) })
    }

    return { total: parsed.length, created: data.length, skipped: parsed.length - data.length }
  }

  async remove(id: string) {
    const existing = await this.prisma.employee.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Không tìm thấy nhân viên ${id}`)
    // Nhân viên có thể được gắn vào chứng từ các phân hệ (employeeId dạng tham chiếu lỏng).
    const counts = await this.prisma.$transaction([
      this.prisma.cashVoucher.count({ where: { employeeId: id } }),
      this.prisma.bankVoucher.count({ where: { employeeId: id } }),
      this.prisma.purchaseVoucher.count({ where: { employeeId: id } }),
      this.prisma.salesVoucher.count({ where: { salesEmployeeId: id } }),
    ])
    const usedBy = counts.reduce((sum, n) => sum + n, 0)
    if (usedBy > 0) {
      throw new ConflictException(`Nhân viên đang gắn với ${usedBy} chứng từ, không thể xóa`)
    }
    await this.prisma.employee.delete({ where: { id } })
    return { id }
  }

  private async ensureCodeFree(code: string) {
    const dup = await this.prisma.employee.findUnique({ where: { code } })
    if (dup) throw new ConflictException(`Mã nhân viên "${code}" đã tồn tại`)
  }
}

function toEmployeeDto(e: Employee) {
  return {
    id: e.id,
    code: e.code,
    name: e.name,
    title: e.title,
    department: e.department,
    bankAccount: e.bankAccount,
    bankName: e.bankName,
    isActive: e.isActive,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }
}
