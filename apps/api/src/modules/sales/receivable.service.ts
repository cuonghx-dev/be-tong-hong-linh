import type { Paginated } from '@app/shared'
import { Injectable } from '@nestjs/common'
import { Prisma, SalesPaymentMode } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CustomerFilterDto } from './dto/customer-filter.dto'

@Injectable()
export class ReceivableService {
  constructor(private readonly prisma: PrismaService) {}

  // Công nợ phải thu theo khách hàng (§6) — tổng hợp từ chứng từ bán hàng chưa thu.
  async list(filter: CustomerFilterDto): Promise<Paginated<ReceivableRow>> {
    const where: Prisma.CustomerWhereInput = {}
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { taxCode: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ])

    const grouped = await this.prisma.salesVoucher.groupBy({
      by: ['customerId'],
      where: { customerId: { in: rows.map((r) => r.id) }, paymentMode: SalesPaymentMode.UNPAID },
      _sum: { totalAmount: true },
    })
    const byId = new Map(
      grouped
        .filter((g) => g.customerId)
        .map((g) => [g.customerId as string, g._sum.totalAmount ?? new Prisma.Decimal(0)]),
    )

    const data: ReceivableRow[] = rows.map((c) => {
      const receivableByInvoice = byId.get(c.id) ?? new Prisma.Decimal(0)
      const prepaidOrDeduction = new Prisma.Decimal(0)
      return {
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
        address: c.address,
        taxCode: c.taxCode,
        groupId: c.groupId,
        receivableByInvoice: receivableByInvoice.toString(),
        prepaidOrDeduction: prepaidOrDeduction.toString(),
        remainingReceivable: receivableByInvoice.sub(prepaidOrDeduction).toString(),
      }
    })

    return { data, pagination: { page: filter.page, pageSize: filter.pageSize, total } }
  }
}

interface ReceivableRow {
  customerId: string
  customerCode: string
  customerName: string
  address: string | null
  taxCode: string | null
  groupId: string | null
  receivableByInvoice: string
  prepaidOrDeduction: string
  remainingReceivable: string
}
