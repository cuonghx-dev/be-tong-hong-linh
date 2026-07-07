import type { Paginated } from '@app/shared'
import { ReceivableAging, ReceivableStatus } from '@app/shared'
import { Injectable } from '@nestjs/common'
import { Prisma, SalesPaymentMode } from '@prisma/client'
import { CHART_OF_ACCOUNTS } from '@app/shared'
import { PrismaService } from '../../database/prisma.service'
import { ReceivableFilterDto } from './dto/receivable-filter.dto'

const MS_PER_DAY = 86_400_000

@Injectable()
export class ReceivableService {
  constructor(private readonly prisma: PrismaService) {}

  // Công nợ phải thu theo khách hàng (§6) — tổng hợp từ chứng từ bán hàng chưa thu.
  // Hỗ trợ lọc: Đến ngày (số dư tính đến ngày), tuổi nợ, tình trạng nợ, TK công nợ.
  async list(filter: ReceivableFilterDto): Promise<Paginated<ReceivableRow>> {
    const where: Prisma.CustomerWhereInput = {}
    if (filter.keyword) {
      where.OR = [
        { code: { contains: filter.keyword, mode: 'insensitive' } },
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { taxCode: { contains: filter.keyword, mode: 'insensitive' } },
      ]
    }

    // Lọc theo TK công nợ: dữ liệu hiện chỉ ghi nhận trên TK 131 (§7). TK khác → không có số dư.
    const accountMismatch = !!filter.account && filter.account !== CHART_OF_ACCOUNTS.RECEIVABLE

    // Số dư tính đến "Đến ngày" (mặc định hôm nay) — bỏ giờ, so theo ngày.
    const asOf = dateOnly(filter.toDate ? new Date(filter.toDate) : new Date())

    // Toàn bộ khách hàng khớp keyword (lọc tình trạng/tuổi nợ phụ thuộc tổng hợp → phân trang trong bộ nhớ).
    const customers = await this.prisma.customer.findMany({ where, orderBy: [{ name: 'asc' }] })

    // Chứng từ bán hàng chưa thu, phát sinh ≤ Đến ngày.
    const vouchers = accountMismatch
      ? []
      : await this.prisma.salesVoucher.findMany({
          where: {
            customerId: { in: customers.map((c) => c.id) },
            paymentMode: SalesPaymentMode.UNPAID,
            voucherDate: { lte: asOf },
          },
          select: { customerId: true, voucherDate: true, dueDate: true, totalAmount: true },
        })

    // Cộng dồn theo khách hàng; nếu chọn 1 bucket tuổi nợ thì chỉ cộng chứng từ trong bucket đó.
    const aging = filter.aging ?? ReceivableAging.All
    const sums = new Map<string, Prisma.Decimal>()
    for (const v of vouchers) {
      if (!v.customerId) continue
      if (aging !== ReceivableAging.All && bucketOf(v.dueDate ?? v.voucherDate, asOf) !== aging) continue
      sums.set(v.customerId, (sums.get(v.customerId) ?? new Prisma.Decimal(0)).add(v.totalAmount))
    }

    let rows: ReceivableRow[] = customers.map((c) => {
      const receivableByInvoice = sums.get(c.id) ?? new Prisma.Decimal(0)
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

    // Lọc tuổi nợ ≠ Tất cả: chỉ giữ KH có số dư trong bucket đã chọn.
    if (aging !== ReceivableAging.All) rows = rows.filter((r) => Number(r.receivableByInvoice) !== 0)

    // Lọc tình trạng nợ theo Số còn phải thu.
    const status = filter.status ?? ReceivableStatus.All
    if (status !== ReceivableStatus.All) {
      rows = rows.filter((r) => {
        const remaining = Number(r.remainingReceivable)
        if (status === ReceivableStatus.Outstanding) return remaining > 0
        if (status === ReceivableStatus.Settled) return remaining === 0
        return remaining < 0 // Prepaid
      })
    }

    const total = rows.length
    const start = (filter.page - 1) * filter.pageSize
    const data = rows.slice(start, start + filter.pageSize)

    return { data, pagination: { page: filter.page, pageSize: filter.pageSize, total } }
  }
}

// Bucket tuổi nợ theo số ngày quá hạn (Đến ngày − hạn thanh toán).
function bucketOf(due: Date, asOf: Date): ReceivableAging {
  const overdue = Math.floor((dateOnly(asOf).getTime() - dateOnly(due).getTime()) / MS_PER_DAY)
  if (overdue <= 0) return ReceivableAging.Current
  if (overdue <= 30) return ReceivableAging.Days1_30
  if (overdue <= 60) return ReceivableAging.Days31_60
  if (overdue <= 90) return ReceivableAging.Days61_90
  return ReceivableAging.Over90
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
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
