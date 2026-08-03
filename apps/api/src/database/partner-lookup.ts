import { PartnerType } from '@prisma/client'
import { PrismaService } from './prisma.service'

// Tra cứu đối tượng (KH/NCC/NV) theo tên khi nhập khẩu chứng từ.
// File MISA chỉ lưu tên đối tượng dạng chuỗi; helper này nạp toàn bộ danh mục 1 lần
// rồi map tên chuẩn hóa → id/code. Field FK thật (Sales.customerId, Purchase.supplierId,
// GoodsIssue.customerId) dùng `id`; field mã hiển thị (partnerId/employeeId trên
// chứng từ quỹ/tiền gửi/nhập kho — FE coi là "Mã đối tượng") dùng `code`.
// Dùng chung cho mọi *Service.importXlsx (UI nhập Excel + seed đều hưởng).

export interface ResolvedPartner {
  type: PartnerType
  id: string
  code: string
  name: string
}

export interface PartnerLookup {
  customer(name: string | null | undefined): { id: string; code: string; name: string } | null
  supplier(name: string | null | undefined): { id: string; code: string; name: string } | null
  employee(name: string | null | undefined): { id: string; code: string; name: string } | null
  // Thử lần lượt KH → NCC → NV (dùng cho chứng từ quỹ/tiền gửi không biết trước loại).
  any(name: string | null | undefined): ResolvedPartner | null
}

// Chuẩn hóa tên: bỏ khoảng trắng thừa, thường hóa, gộp nhiều space → 1.
function norm(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

type PartnerRow = { id: string; code: string; name: string }

function buildMap(rows: PartnerRow[]): Map<string, PartnerRow> {
  const m = new Map<string, PartnerRow>()
  for (const r of rows) {
    const key = norm(r.name)
    if (key && !m.has(key)) m.set(key, { id: r.id, code: r.code, name: r.name })
  }
  return m
}

export async function buildPartnerLookup(prisma: PrismaService): Promise<PartnerLookup> {
  const [customers, suppliers, employees] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, code: true, name: true } }),
    prisma.supplier.findMany({ select: { id: true, code: true, name: true } }),
    prisma.employee.findMany({ select: { id: true, code: true, name: true } }),
  ])
  const cMap = buildMap(customers)
  const sMap = buildMap(suppliers)
  const eMap = buildMap(employees)

  const get = (m: Map<string, PartnerRow>, name: string | null | undefined) =>
    name ? (m.get(norm(name)) ?? null) : null

  return {
    customer: (name) => get(cMap, name),
    supplier: (name) => get(sMap, name),
    employee: (name) => get(eMap, name),
    any: (name) => {
      const c = get(cMap, name)
      if (c) return { type: PartnerType.CUSTOMER, ...c }
      const s = get(sMap, name)
      if (s) return { type: PartnerType.SUPPLIER, ...s }
      const e = get(eMap, name)
      if (e) return { type: PartnerType.EMPLOYEE, ...e }
      return null
    },
  }
}
