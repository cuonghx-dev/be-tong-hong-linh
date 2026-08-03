import type { CollectPaymentResultDto, OpenReceivableVoucherDto, Paginated } from '@app/shared'
import { CHART_OF_ACCOUNTS, PaymentMethod, ReceivableAging, ReceivableStatus } from '@app/shared'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, SalesPaymentMode } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { BankService } from '../bank/bank.service'
import { BookLockService } from '../book-lock/book-lock.service'
import { CashService } from '../cash/cash.service'
import { CollectPaymentDto } from './dto/collect-payment.dto'
import { ReceivableFilterDto } from './dto/receivable-filter.dto'

const MS_PER_DAY = 86_400_000
const ZERO = new Prisma.Decimal(0)
// Mọi TK con của 131 (1311, 1312…) đều là phải thu khách hàng.
const RECEIVABLE_LIKE = `${CHART_OF_ACCOUNTS.RECEIVABLE}%`

@Injectable()
export class ReceivableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLock: BookLockService,
    private readonly cash: CashService,
    private readonly bank: BankService,
  ) {}

  // Công nợ phải thu theo khách hàng (§6) — cùng quy ước với báo cáo công nợ
  // (sales-report): Nợ 131 = chứng từ bán UNPAID + NVK; Có 131 = phiếu thu tiền
  // mặt/tiền gửi + NVK; dư đầu = khai báo (partner_opening_balances).
  //   Còn phải thu theo HĐ = Σ (tổng tiền − đã đối trừ) từng chứng từ bán chưa thu.
  //   Còn phải thu        = dư khai báo + Nợ 131 − Có 131 (tính đến "Đến ngày").
  //   Thu trước/Giảm trừ  = chênh lệch 2 số trên (tiền đã thu chưa gắn hóa đơn…).
  // Hỗ trợ lọc: Đến ngày, tuổi nợ (theo số còn phải thu từng chứng từ), tình trạng nợ, TK công nợ.
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
    const customerIds = customers.map((c) => c.id)

    // Chứng từ bán hàng chưa thu ≤ Đến ngày, kèm đối trừ đã ghi sổ (nguồn tiền posted, ≤ Đến ngày).
    const vouchers = accountMismatch
      ? []
      : await this.prisma.salesVoucher.findMany({
          where: {
            customerId: { in: customerIds },
            paymentMode: SalesPaymentMode.UNPAID,
            posted: true, // bỏ ghi = loại khỏi công nợ
            voucherDate: { lte: asOf },
          },
          select: {
            customerId: true,
            voucherDate: true,
            dueDate: true,
            totalAmount: true,
            allocations: {
              where: {
                OR: [
                  { cashVoucher: { posted: true, postingDate: { lte: asOf } } },
                  { bankVoucher: { posted: true, postingDate: { lte: asOf } } },
                ],
              },
              select: { amount: true },
            },
          },
        })

    // Phát sinh 131 ngoài chứng từ bán (Có 131 phiếu thu/thu tiền gửi, NVK 2 chiều)
    // + dư đầu khai báo — cùng nguồn với báo cáo công nợ để 2 màn ra 1 số.
    const [declared, credits] = accountMismatch
      ? [[], []]
      : await Promise.all([this.declaredOpenings(), this.otherReceivableMoves(asOf)])

    // Quy đối tượng dòng phát sinh về KH: ưu tiên id, fallback khớp tên (dữ liệu nhập khẩu).
    const byId = new Map(customers.map((c) => [c.id, c]))
    const byName = new Map(customers.map((c) => [normalizeName(c.name), c]))
    const resolveId = (partnerId: string | null, partnerName: string | null): string | null => {
      if (partnerId && byId.has(partnerId)) return partnerId
      if (partnerName) return byName.get(normalizeName(partnerName))?.id ?? null
      return null
    }

    // Cộng dồn "Còn phải thu theo HĐ" theo KH; nếu chọn 1 bucket tuổi nợ thì chỉ
    // cộng chứng từ trong bucket đó (bucket tính trên số còn phải thu của chứng từ).
    const aging = filter.aging ?? ReceivableAging.All
    const byInvoice = new Map<string, Prisma.Decimal>()
    // Tổng Nợ 131 từ chứng từ bán (không trừ đối trừ) — thành phần của "Còn phải thu".
    const salesDebit = new Map<string, Prisma.Decimal>()
    for (const v of vouchers) {
      if (!v.customerId) continue
      salesDebit.set(v.customerId, (salesDebit.get(v.customerId) ?? ZERO).add(v.totalAmount))
      const allocated = v.allocations.reduce((s, a) => s.add(a.amount), ZERO)
      const remaining = new Prisma.Decimal(v.totalAmount).sub(allocated)
      if (remaining.isZero() || remaining.isNegative()) continue
      if (aging !== ReceivableAging.All && bucketOf(v.dueDate ?? v.voucherDate, asOf) !== aging) continue
      byInvoice.set(v.customerId, (byInvoice.get(v.customerId) ?? ZERO).add(remaining))
    }

    // Số dư ngoài hóa đơn: dư khai báo + NVK Nợ 131 − (Có 131 phiếu thu/thu tiền gửi + NVK).
    const others = new Map<string, Prisma.Decimal>()
    const addOther = (customerId: string | null, amount: Prisma.Decimal) => {
      if (!customerId) return
      others.set(customerId, (others.get(customerId) ?? ZERO).add(amount))
    }
    for (const d of declared) addOther(resolveId(d.partner_id, null), new Prisma.Decimal(d.balance))
    for (const r of credits) {
      const signed = r.kind === 'DEBIT' ? new Prisma.Decimal(r.amount) : new Prisma.Decimal(r.amount).neg()
      addOther(resolveId(r.partner_id, r.partner_name), signed)
    }

    let rows: ReceivableRow[] = customers.map((c) => {
      const receivableByInvoice = byInvoice.get(c.id) ?? ZERO
      // Còn phải thu = Nợ 131 chứng từ bán + số dư ngoài hóa đơn (đối trừ đã nằm
      // trong Có 131 của phiếu thu nên không trừ lần nữa).
      const remaining = (salesDebit.get(c.id) ?? ZERO).add(others.get(c.id) ?? ZERO)
      const prepaidOrDeduction = receivableByInvoice.sub(remaining)
      return {
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
        address: c.address,
        taxCode: c.taxCode,
        groupId: c.groupId,
        receivableByInvoice: receivableByInvoice.toString(),
        prepaidOrDeduction: prepaidOrDeduction.toString(),
        remainingReceivable: remaining.toString(),
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

  // Chứng từ bán hàng còn phải thu của 1 KH — nguồn chọn trong form "Thu tiền khách hàng".
  // Còn phải thu trừ MỌI đối trừ (kể cả nguồn chưa ghi sổ) để không cho thu quá tay.
  async openVouchers(customerId: string): Promise<OpenReceivableVoucherDto[]> {
    const vouchers = await this.prisma.salesVoucher.findMany({
      where: { customerId, paymentMode: SalesPaymentMode.UNPAID, posted: true },
      orderBy: [{ postingDate: 'asc' }, { voucherNo: 'asc' }],
      select: {
        id: true,
        voucherNo: true,
        invoiceNo: true,
        postingDate: true,
        dueDate: true,
        description: true,
        totalAmount: true,
        allocations: { select: { amount: true } },
      },
    })
    return vouchers
      .map((v) => {
        const paid = v.allocations.reduce((s, a) => s.add(a.amount), ZERO)
        return {
          salesVoucherId: v.id,
          voucherNo: v.voucherNo,
          invoiceNo: v.invoiceNo,
          postingDate: toDateOnlyString(v.postingDate),
          dueDate: v.dueDate ? toDateOnlyString(v.dueDate) : null,
          description: v.description,
          totalAmount: v.totalAmount.toString(),
          paidAmount: paid.toString(),
          remainingAmount: new Prisma.Decimal(v.totalAmount).sub(paid).toString(),
        }
      })
      .filter((v) => Number(v.remainingAmount) > 0)
  }

  // Thu tiền khách hàng theo hóa đơn (MISA: Thu tiền khách hàng): sinh phiếu thu
  // tiền mặt / thu tiền gửi hạch toán Nợ 111x-112x / Có 131 + ghi đối trừ từng
  // chứng từ bán hàng — atomic trong 1 transaction.
  async collect(dto: CollectPaymentDto): Promise<CollectPaymentResultDto> {
    await this.bookLock.assertUnlocked(dto.postingDate)
    if (dto.paymentMethod === PaymentMethod.BankTransfer && !dto.bankAccountNo) {
      throw new BadRequestException('Thu tiền chuyển khoản phải chọn tài khoản ngân hàng nhận')
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: dto.customerId } })
      if (!customer) throw new NotFoundException(`Không tìm thấy khách hàng ${dto.customerId}`)

      const ids = dto.allocations.map((a) => a.salesVoucherId)
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Trùng chứng từ trong danh sách đối trừ')
      }
      const vouchers = await tx.salesVoucher.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          voucherNo: true,
          customerId: true,
          paymentMode: true,
          posted: true,
          totalAmount: true,
          lines: { orderBy: { lineNo: 'asc' }, take: 1, select: { debtAccount: true } },
          allocations: { select: { amount: true } },
        },
      })
      const byId = new Map(vouchers.map((v) => [v.id, v]))

      const lines: { description: string | null; creditAccount: string; amount: Prisma.Decimal }[] = []
      for (const a of dto.allocations) {
        const v = byId.get(a.salesVoucherId)
        if (!v) throw new NotFoundException(`Không tìm thấy chứng từ ${a.salesVoucherId}`)
        if (v.customerId !== dto.customerId) {
          throw new BadRequestException(`Chứng từ ${v.voucherNo} không thuộc khách hàng đã chọn`)
        }
        if (v.paymentMode !== SalesPaymentMode.UNPAID || !v.posted) {
          throw new BadRequestException(`Chứng từ ${v.voucherNo} không còn công nợ để đối trừ`)
        }
        const paid = v.allocations.reduce((s, x) => s.add(x.amount), ZERO)
        const remaining = new Prisma.Decimal(v.totalAmount).sub(paid)
        const amount = new Prisma.Decimal(a.amount)
        if (amount.greaterThan(remaining)) {
          throw new BadRequestException(
            `Số thu chứng từ ${v.voucherNo} (${amount}) vượt số còn phải thu (${remaining})`,
          )
        }
        lines.push({
          description: `Thu tiền chứng từ ${v.voucherNo}`,
          creditAccount: v.lines[0]?.debtAccount ?? CHART_OF_ACCOUNTS.RECEIVABLE,
          amount,
        })
      }

      const input = {
        postingDate: new Date(dto.postingDate),
        voucherDate: new Date(dto.voucherDate),
        // partnerId trên phiếu thu = MÃ khách hàng (FE hiển thị trực tiếp).
        customerCode: customer.code,
        customerName: customer.name,
        address: customer.address,
        reason: dto.description ?? `Thu tiền khách hàng ${customer.name}`,
        branchId: null,
        posted: true,
        lines,
      }
      const receipt =
        dto.paymentMethod === PaymentMethod.BankTransfer
          ? await this.bank.createCustomerReceipt(tx, {
              ...input,
              bankAccountNo: dto.bankAccountNo ?? null,
              bankName: dto.bankName ?? null,
            })
          : await this.cash.createCustomerReceipt(tx, input)

      await tx.paymentAllocation.createMany({
        data: dto.allocations.map((a) => ({
          salesVoucherId: a.salesVoucherId,
          cashVoucherId: dto.paymentMethod === PaymentMethod.BankTransfer ? null : receipt.id,
          bankVoucherId: dto.paymentMethod === PaymentMethod.BankTransfer ? receipt.id : null,
          amount: new Prisma.Decimal(a.amount),
        })),
      })

      const totalAmount = lines.reduce((s, l) => s.add(l.amount), ZERO)
      return { voucherId: receipt.id, voucherNo: receipt.voucherNo, totalAmount: totalAmount.toString() }
    })
  }

  // Dư đầu 131 khai báo theo KH (partner_opening_balances).
  private declaredOpenings() {
    return this.prisma.$queryRaw<{ partner_id: string; balance: string }[]>(Prisma.sql`
      SELECT partner_id, SUM(debit_amount - credit_amount)::text AS balance
      FROM partner_opening_balances
      WHERE partner_type = 'CUSTOMER' AND account_code LIKE ${RECEIVABLE_LIKE}
      GROUP BY partner_id
    `)
  }

  // Phát sinh 131 ngoài chứng từ bán ≤ Đến ngày: Có 131 phiếu thu tiền mặt/tiền gửi
  // (đã ghi sổ) + chứng từ NVK 2 chiều — cùng nguồn với sales-report.receivableRows.
  private otherReceivableMoves(asOf: Date) {
    return this.prisma.$queryRaw<
      { kind: 'DEBIT' | 'CREDIT'; partner_id: string | null; partner_name: string | null; amount: string }[]
    >(Prisma.sql`
      SELECT 'CREDIT' AS kind,
             COALESCE(l.partner_id, v.partner_id) AS partner_id,
             COALESCE(l.partner_name, v.partner_name) AS partner_name,
             l.amount::text AS amount
      FROM cash_voucher_lines l
      JOIN cash_vouchers v ON v.id = l.voucher_id
      WHERE v.posted AND l.credit_account LIKE ${RECEIVABLE_LIKE} AND v.posting_date <= ${asOf}
      UNION ALL
      SELECT 'CREDIT',
             COALESCE(l.partner_id, v.partner_id),
             COALESCE(l.partner_name, v.partner_name),
             l.amount::text
      FROM bank_voucher_lines l
      JOIN bank_vouchers v ON v.id = l.voucher_id
      WHERE v.posted AND l.credit_account LIKE ${RECEIVABLE_LIKE} AND v.posting_date <= ${asOf}
      UNION ALL
      SELECT 'DEBIT', l.debit_partner_id, l.debit_partner_name, l.amount::text
      FROM general_voucher_lines l
      JOIN general_vouchers v ON v.id = l.voucher_id
      WHERE v.posted AND l.debit_account LIKE ${RECEIVABLE_LIKE} AND v.posting_date <= ${asOf}
      UNION ALL
      SELECT 'CREDIT', l.credit_partner_id, l.credit_partner_name, l.amount::text
      FROM general_voucher_lines l
      JOIN general_vouchers v ON v.id = l.voucher_id
      WHERE v.posted AND l.credit_account LIKE ${RECEIVABLE_LIKE} AND v.posting_date <= ${asOf}
    `)
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

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// So tên KH không phân biệt hoa thường/khoảng trắng thừa (dữ liệu nhập khẩu).
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
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
