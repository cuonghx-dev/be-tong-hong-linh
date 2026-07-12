import { ProductType } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedProduct {
  code: string
  name: string
  type: ProductType
  groupCode: string | null
  unit: string | null
  description: string | null
  purchaseDescription: string | null
  saleDescription: string | null
  defaultWarehouseCode: string | null
  defaultWarehouseName: string | null
  inventoryAccount: string | null
  revenueAccount: string | null
  discountAccount: string | null
  saleReturnAccount: string | null
  costAccount: string | null
  purchasePrice: string | null
  salePrice: string | null
  minStock: string | null
  vatRate: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_hang_hoa_dich_vu.xlsx). Chấp nhận vài biến thể.
// Khớp không phân biệt hoa/thường (xem normalize + idx).
const COL = {
  code: ['Mã', 'Mã hàng', 'Mã VTHH'],
  name: ['Tên', 'Tên hàng'],
  type: ['Tính chất'],
  groupCode: ['Nhóm VTHH', 'Nhóm', 'Nhóm HHDV'],
  unit: ['Đơn vị tính chính', 'Đơn vị tính', 'ĐVT'],
  description: ['Mô tả'],
  purchaseDescription: ['Diễn giải khi mua'],
  saleDescription: ['Diễn giải khi bán'],
  defaultWarehouseCode: ['Mã kho ngầm định'],
  defaultWarehouseName: ['Kho ngầm định'],
  inventoryAccount: ['TK Kho'],
  revenueAccount: ['TK Doanh thu'],
  discountAccount: ['TK chiết khấu'],
  saleReturnAccount: ['TK Trả lại'],
  costAccount: ['TK chi phí'],
  purchasePrice: ['Đơn giá mua gần nhất', 'Đơn giá mua cố định'],
  salePrice: ['Đơn giá bán 1', 'Đơn giá bán cố định'],
  minStock: ['Số lượng tồn tối thiểu'],
  vatRate: ['Thuế suất GTGT'],
  status: ['Trạng thái'],
}

// Ánh xạ "Tính chất" (tiếng Việt) → ProductType. Mặc định Hàng hóa.
const TYPE_MAP: Record<string, ProductType> = {
  'hàng hóa': ProductType.GOODS,
  'dịch vụ': ProductType.SERVICE,
  'thành phẩm': ProductType.FINISHED,
  'nguyên vật liệu': ProductType.MATERIAL,
  'công cụ dụng cụ': ProductType.TOOL,
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// Số về chuỗi Decimal; bỏ 0 và giá trị rỗng (coi như chưa nhập).
function toNum(v: unknown): string | null {
  const s = toStr(v)
  if (s === null) return null
  const n = Number(s.replace(/,/g, ''))
  if (!Number.isFinite(n) || n === 0) return null
  return String(n)
}

// Chuẩn hóa header để so khớp: bỏ khoảng trắng thừa + hạ chữ thường.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// "Ngừng sử dụng" → false; còn lại (kể cả thiếu cột) coi là đang sử dụng.
function activeFromText(text: string | null): boolean {
  return !(text && text.toLowerCase().includes('ngừng'))
}

function typeFromText(text: string | null): ProductType {
  if (!text) return ProductType.GOODS
  return TYPE_MAP[normalize(text)] ?? ProductType.GOODS
}

// Parse file xlsx hàng hóa dịch vụ → danh sách hàng hóa.
export function parseProductXlsx(buffer: Buffer): ParsedProduct[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa đồng thời nhãn "mã" và "tính chất" (tránh bắt nhầm tiêu đề).
  const codeNorm = COL.code.map(normalize)
  const typeNorm = COL.type.map(normalize)
  const headerIdx = rows.findIndex((r) => {
    const cells = r.map((c) => normalize(toStr(c) ?? ''))
    return cells.some((c) => codeNorm.includes(c)) && cells.some((c) => typeNorm.includes(c))
  })
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => normalize(toStr(c) ?? ''))
  // Trả về vị trí cột đầu tiên khớp bất kỳ tên nào trong danh sách.
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(normalize(n))
      if (i >= 0) return i
    }
    return -1
  }

  const map = Object.fromEntries(
    Object.entries(COL).map(([k, names]) => [k, idx(names)]),
  ) as Record<keyof typeof COL, number>

  const get = (r: unknown[], i: number) => (i >= 0 ? toStr(r[i]) : null)

  const out: ParsedProduct[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = get(r, map.code)
    const name = get(r, map.name)
    if (!code || !name) continue // bỏ dòng thiếu mã hoặc tên

    out.push({
      code,
      name,
      type: typeFromText(get(r, map.type)),
      groupCode: get(r, map.groupCode),
      unit: get(r, map.unit),
      description: get(r, map.description),
      purchaseDescription: get(r, map.purchaseDescription),
      saleDescription: get(r, map.saleDescription),
      defaultWarehouseCode: get(r, map.defaultWarehouseCode),
      defaultWarehouseName: get(r, map.defaultWarehouseName),
      inventoryAccount: get(r, map.inventoryAccount),
      revenueAccount: get(r, map.revenueAccount),
      discountAccount: get(r, map.discountAccount),
      saleReturnAccount: get(r, map.saleReturnAccount),
      costAccount: get(r, map.costAccount),
      purchasePrice: map.purchasePrice >= 0 ? toNum(r[map.purchasePrice]) : null,
      salePrice: map.salePrice >= 0 ? toNum(r[map.salePrice]) : null,
      minStock: map.minStock >= 0 ? toNum(r[map.minStock]) : null,
      vatRate: get(r, map.vatRate),
      isActive: activeFromText(get(r, map.status)),
    })
  }
  return out
}
