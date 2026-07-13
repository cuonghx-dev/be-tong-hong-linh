import type { Paginated, SupplierPayableDto } from '@app/shared'
import { CHART_OF_ACCOUNTS, ReceivableAging, ReceivableStatus } from '@app/shared'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { PayableFilterDto } from './dto/payable-filter.dto'

const ZERO = new Prisma.Decimal(0)
const MS_PER_DAY = 86_400_000
// Mọi TK con của 331 (3311, 3312…) đều là phải trả nhà cung cấp.
export const PAYABLE_LIKE = `${CHART_OF_ACCOUNTS.PAYABLE}%`

// 1 dòng phát sinh công nợ 331: CREDIT = chứng từ mua chưa trả (Có 331),
// DEBIT = phiếu chi tiền mặt/tiền gửi trả NCC (Nợ 331).
export interface RawPayableRow {
  voucher_id: string
  source: 'PURCHASE' | 'CASH' | 'BANK'
  kind: 'CREDIT' | 'DEBIT'
  posting_date: string
  due_date: string | null // Hạn thanh toán (chỉ chứng từ mua) — bucket tuổi nợ
  voucher_no: string
  description: string | null
  partner_id: string | null
  partner_name: string | null
  amount: string
}

// Thông tin NCC sau khi quy về 1 khóa gộp (id nếu có, fallback tên).
export interface SupplierKey {
  key: string
  supplierId: string | null
  supplierCode: string | null
  supplierName: string
}

export type SupplierResolver = (partnerId: string | null, partnerName: string | null) => SupplierKey

// Số dư khai báo đầu kỳ TK 331 theo NCC.
export interface DeclaredOpening {
  partner_id: string
  balance: string
}

// Công nợ phải trả NCC (TK 331) — helper dùng chung cho báo cáo mua hàng
// (PurchaseReportService) và tab "Đối chiếu công nợ".
@Injectable()
export class PayableService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tab Đối chiếu công nợ: công nợ theo NCC tính đến "Đến ngày" ────────────
  // Số liệu net (khớp báo cáo Tổng hợp công nợ NCC khi không lọc tuổi nợ):
  // theo HĐ = dư đầu khai báo + Có 331; trả trước/giảm trừ = Nợ 331 (phiếu chi).
  async list(filter: PayableFilterDto): Promise<Paginated<SupplierPayableDto>> {
    // Lọc theo TK công nợ: dữ liệu hiện chỉ ghi nhận trên 331. TK khác → không có số dư.
    const accountMismatch = !!filter.account && filter.account !== CHART_OF_ACCOUNTS.PAYABLE

    // Số dư tính đến "Đến ngày" (mặc định hôm nay) — bỏ giờ, so theo ngày.
    const asOf = dateOnly(filter.toDate ? new Date(filter.toDate) : new Date())

    const [suppliers, declared, rows] = await Promise.all([
      this.prisma.supplier.findMany({
        select: { id: true, code: true, name: true, address: true, taxCode: true },
      }),
      accountMismatch ? [] : this.declaredOpenings(),
      accountMismatch ? [] : this.payableRows(Prisma.sql`v.posting_date <= ${asOf}`),
    ])

    const resolve = buildSupplierResolver(suppliers)
    const supplierById = new Map(suppliers.map((s) => [s.id, s]))

    // Gom theo NCC: byInvoice = dư đầu + Có 331; prepaid = Nợ 331 (đã trả).
    interface Bucket extends Omit<SupplierKey, 'key'> {
      byInvoice: Prisma.Decimal
      prepaid: Prisma.Decimal
    }
    const buckets = new Map<string, Bucket>()
    const bucketOf = (k: SupplierKey): Bucket => {
      let b = buckets.get(k.key)
      if (!b) {
        b = {
          supplierId: k.supplierId,
          supplierCode: k.supplierCode,
          supplierName: k.supplierName,
          byInvoice: ZERO,
          prepaid: ZERO,
        }
        buckets.set(k.key, b)
      }
      return b
    }

    // Lọc tuổi nợ ≠ Tất cả: chỉ cộng chứng từ mua trong bucket đã chọn; dư đầu
    // khai báo không có hạn thanh toán nên bị loại khỏi cột "theo HĐ".
    const aging = filter.aging ?? ReceivableAging.All
    if (aging === ReceivableAging.All) {
      for (const d of declared) {
        const b = bucketOf(resolve(d.partner_id, null))
        b.byInvoice = b.byInvoice.add(d.balance)
      }
    }
    for (const r of rows) {
      const b = bucketOf(resolve(r.partner_id, r.partner_name))
      if (r.kind === 'CREDIT') {
        if (aging !== ReceivableAging.All && agingBucketOf(r.due_date ?? r.posting_date, asOf) !== aging) {
          continue
        }
        b.byInvoice = b.byInvoice.add(r.amount)
      } else {
        b.prepaid = b.prepaid.add(r.amount)
      }
    }

    let list: SupplierPayableDto[] = [...buckets.values()].map((b) => {
      const matched = b.supplierId ? supplierById.get(b.supplierId) : undefined
      return {
        supplierId: b.supplierId,
        supplierCode: b.supplierCode,
        supplierName: b.supplierName,
        address: matched?.address ?? null,
        taxCode: matched?.taxCode ?? null,
        payableByInvoice: b.byInvoice.toString(),
        prepaidOrDeduction: b.prepaid.toString(),
        remainingPayable: b.byInvoice.sub(b.prepaid).toString(),
      }
    })

    // Bỏ NCC không có số liệu; lọc tuổi nợ ≠ Tất cả thì chỉ giữ NCC có nợ trong bucket.
    list = list.filter((r) =>
      aging !== ReceivableAging.All
        ? Number(r.payableByInvoice) !== 0
        : Number(r.payableByInvoice) !== 0 || Number(r.prepaidOrDeduction) !== 0,
    )

    // Lọc tình trạng nợ theo Số còn phải trả.
    const status = filter.status ?? ReceivableStatus.All
    if (status !== ReceivableStatus.All) {
      list = list.filter((r) => {
        const remaining = Number(r.remainingPayable)
        if (status === ReceivableStatus.Outstanding) return remaining > 0
        if (status === ReceivableStatus.Settled) return remaining === 0
        return remaining < 0 // Prepaid
      })
    }

    // Tìm theo mã / tên / MST (in-memory — tổng hợp đã gộp cả NCC name-only).
    if (filter.keyword) {
      const kw = filter.keyword.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.supplierName.toLowerCase().includes(kw) ||
          (r.supplierCode?.toLowerCase().includes(kw) ?? false) ||
          (r.taxCode?.toLowerCase().includes(kw) ?? false),
      )
    }

    list.sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'vi'))

    const total = list.length
    const start = (filter.page - 1) * filter.pageSize
    const data = list.slice(start, start + filter.pageSize)

    return { data, pagination: { page: filter.page, pageSize: filter.pageSize, total } }
  }

  // ── Helpers dùng chung với PurchaseReportService ───────────────────────────

  // Số dư khai báo đầu kỳ TK 331 theo NCC (partner_opening_balances).
  async declaredOpenings(): Promise<DeclaredOpening[]> {
    return this.prisma.$queryRaw<DeclaredOpening[]>(Prisma.sql`
      SELECT partner_id, SUM(credit_amount - debit_amount)::text AS balance
      FROM partner_opening_balances
      WHERE partner_type = 'SUPPLIER' AND account_code LIKE ${PAYABLE_LIKE}
      GROUP BY partner_id
    `)
  }

  // Dòng phát sinh 331 từ 3 nguồn (UNION): chứng từ mua UNPAID ghi Có; phiếu chi
  // tiền mặt / tiền gửi ghi Nợ. Đối tượng ưu tiên theo dòng, fallback header.
  async payableRows(dateCond: Prisma.Sql): Promise<RawPayableRow[]> {
    return this.prisma.$queryRaw<RawPayableRow[]>(Prisma.sql`
      SELECT v.id AS voucher_id,
             'PURCHASE' AS source,
             'CREDIT' AS kind,
             v.posting_date::text AS posting_date,
             v.due_date::text AS due_date,
             v.voucher_no,
             v.description,
             v.supplier_id AS partner_id,
             v.supplier_name AS partner_name,
             (l.amount + l.vat_amount)::text AS amount
      FROM purchase_voucher_lines l
      JOIN purchase_vouchers v ON v.id = l.voucher_id
      WHERE v.payment_mode = 'UNPAID'
        AND l.payable_account LIKE ${PAYABLE_LIKE}
        AND ${dateCond}
      UNION ALL
      SELECT v.id,
             'CASH',
             'DEBIT',
             v.posting_date::text,
             NULL,
             v.voucher_no,
             COALESCE(l.description, v.reason),
             COALESCE(l.partner_id, v.partner_id),
             COALESCE(l.partner_name, v.partner_name),
             l.amount::text
      FROM cash_voucher_lines l
      JOIN cash_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account LIKE ${PAYABLE_LIKE}
        AND ${dateCond}
      UNION ALL
      SELECT v.id,
             'BANK',
             'DEBIT',
             v.posting_date::text,
             NULL,
             v.voucher_no,
             COALESCE(l.description, v.reason),
             COALESCE(l.partner_id, v.partner_id),
             COALESCE(l.partner_name, v.partner_name),
             l.amount::text
      FROM bank_voucher_lines l
      JOIN bank_vouchers v ON v.id = l.voucher_id
      WHERE l.debit_account LIKE ${PAYABLE_LIKE}
        AND ${dateCond}
      ORDER BY posting_date, voucher_no
    `)
  }
}

// Quy chứng từ về 1 NCC: ưu tiên id; chỉ có tên (dữ liệu nhập khẩu) thì match
// đúng tên trong danh mục để nhập chung nhóm, không khớp thì nhóm theo tên.
export function buildSupplierResolver(
  suppliers: { id: string; code: string; name: string }[],
): SupplierResolver {
  const byId = new Map(suppliers.map((s) => [s.id, s]))
  const byName = new Map(suppliers.map((s) => [normalizeName(s.name), s]))
  return (partnerId, partnerName) => {
    const matched =
      (partnerId && byId.get(partnerId)) ||
      (partnerName && byName.get(normalizeName(partnerName))) ||
      null
    if (matched) {
      return { key: matched.id, supplierId: matched.id, supplierCode: matched.code, supplierName: matched.name }
    }
    const name = partnerName?.trim()
    if (name) return { key: `name:${normalizeName(name)}`, supplierId: null, supplierCode: null, supplierName: name }
    return { key: 'unknown', supplierId: null, supplierCode: null, supplierName: 'Không xác định' }
  }
}

// So tên NCC không phân biệt hoa thường/khoảng trắng thừa (dữ liệu nhập khẩu).
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Bucket tuổi nợ theo số ngày quá hạn (Đến ngày − hạn thanh toán).
function agingBucketOf(due: string, asOf: Date): ReceivableAging {
  const overdue = Math.floor((asOf.getTime() - dateOnly(new Date(due)).getTime()) / MS_PER_DAY)
  if (overdue <= 0) return ReceivableAging.Current
  if (overdue <= 30) return ReceivableAging.Days1_30
  if (overdue <= 60) return ReceivableAging.Days31_60
  if (overdue <= 90) return ReceivableAging.Days61_90
  return ReceivableAging.Over90
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
