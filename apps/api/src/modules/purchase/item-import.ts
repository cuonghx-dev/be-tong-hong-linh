import { ItemNature, ItemTaxReduction } from '@prisma/client'
import * as XLSX from 'xlsx'

export interface ParsedItem {
  code: string
  name: string
  nature: ItemNature
  taxReduction: ItemTaxReduction
  groupName: string | null
  unit: string | null
  stockQuantity: number
  stockValue: number
  minStock: number
  warrantyMonths: number | null
  origin: string | null
  description: string | null
  purchaseDescription: string | null
  salesDescription: string | null
  defaultWarehouse: string | null
  stockAccount: string | null
  revenueAccount: string | null
  expenseAccount: string | null
  purchasePrice: number
  salePrice: number
  vatRate: number
  branchName: string | null
  isActive: boolean
}

// Tên cột cần tìm trong header (mẫu Danh_sach_hang_hoa_dich_vu.xlsx).
const COL = {
  code: ['Mã'],
  name: ['Tên'],
  taxReduction: ['Giảm thuế theo quy định'],
  nature: ['Tính chất'],
  groupName: ['Nhóm VTHH'],
  unit: ['Đơn vị tính chính'],
  stockQuantity: ['Số lượng tồn'],
  stockValue: ['Giá trị tồn'],
  minStock: ['Số lượng tồn tối thiểu'],
  warranty: ['Thời hạn bảo hành'],
  origin: ['Nguồn gốc'],
  description: ['Mô tả'],
  purchaseDescription: ['Diễn giải khi mua'],
  salesDescription: ['Diễn giải khi bán'],
  defaultWarehouse: ['Kho ngầm định'],
  stockAccount: ['TK Kho'],
  revenueAccount: ['TK  Doanh thu', 'TK Doanh thu'],
  expenseAccount: ['TK chi phí'],
  purchasePrice: ['Đơn giá mua gần nhất'],
  salePrice: ['Đơn giá bán 1'],
  vatRate: ['Thuế suất GTGT'],
  status: ['Trạng thái'],
  branchName: ['Chi nhánh'],
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

// Ánh xạ văn bản "Tính chất" → enum.
function natureFromText(text: string | null): ItemNature {
  const t = (text ?? '').toLowerCase()
  if (t.includes('dịch vụ')) return ItemNature.SERVICE
  if (t.includes('thành phẩm')) return ItemNature.FINISHED_GOOD
  if (t.includes('nguyên vật liệu') || t.includes('vật tư')) return ItemNature.MATERIAL
  if (t.includes('công cụ') || t.includes('dụng cụ')) return ItemNature.TOOL
  return ItemNature.GOODS
}

function taxReductionFromText(text: string | null): ItemTaxReduction {
  const t = (text ?? '').toLowerCase()
  if (t.includes('không được giảm')) return ItemTaxReduction.NOT_REDUCED
  if (t.includes('được giảm')) return ItemTaxReduction.REDUCED
  return ItemTaxReduction.UNDETERMINED
}

// Parse file xlsx hàng hóa → danh sách HHDV.
export function parseItemXlsx(buffer: Buffer): ParsedItem[] {
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false })

  // Tìm hàng header chứa cả "Mã" và "Tên".
  const headerIdx = rows.findIndex((r) => {
    const cells = r.map((c) => toStr(c) ?? '')
    return cells.includes('Mã') && cells.includes('Tên')
  })
  if (headerIdx < 0) return []
  const header = rows[headerIdx]!.map((c) => toStr(c) ?? '')
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }

  const iCode = idx(COL.code)
  const iName = idx(COL.name)
  const iTaxRed = idx(COL.taxReduction)
  const iNature = idx(COL.nature)
  const iGroup = idx(COL.groupName)
  const iUnit = idx(COL.unit)
  const iQty = idx(COL.stockQuantity)
  const iValue = idx(COL.stockValue)
  const iMin = idx(COL.minStock)
  const iWarranty = idx(COL.warranty)
  const iOrigin = idx(COL.origin)
  const iDesc = idx(COL.description)
  const iPurDesc = idx(COL.purchaseDescription)
  const iSalDesc = idx(COL.salesDescription)
  const iWarehouse = idx(COL.defaultWarehouse)
  const iStockAcc = idx(COL.stockAccount)
  const iRevAcc = idx(COL.revenueAccount)
  const iExpAcc = idx(COL.expenseAccount)
  const iPurPrice = idx(COL.purchasePrice)
  const iSalePrice = idx(COL.salePrice)
  const iVat = idx(COL.vatRate)
  const iStatus = idx(COL.status)
  const iBranch = idx(COL.branchName)

  const out: ParsedItem[] = []
  for (const r of rows.slice(headerIdx + 1)) {
    const code = iCode >= 0 ? toStr(r[iCode]) : null
    const name = iName >= 0 ? toStr(r[iName]) : null
    if (!code || !name) continue

    const status = iStatus >= 0 ? toStr(r[iStatus]) : null
    const warranty = iWarranty >= 0 ? toNum(r[iWarranty]) : 0

    out.push({
      code,
      name,
      nature: natureFromText(iNature >= 0 ? toStr(r[iNature]) : null),
      taxReduction: taxReductionFromText(iTaxRed >= 0 ? toStr(r[iTaxRed]) : null),
      groupName: iGroup >= 0 ? toStr(r[iGroup]) : null,
      unit: iUnit >= 0 ? toStr(r[iUnit]) : null,
      stockQuantity: iQty >= 0 ? toNum(r[iQty]) : 0,
      stockValue: iValue >= 0 ? toNum(r[iValue]) : 0,
      minStock: iMin >= 0 ? toNum(r[iMin]) : 0,
      warrantyMonths: warranty > 0 ? warranty : null,
      origin: iOrigin >= 0 ? toStr(r[iOrigin]) : null,
      description: iDesc >= 0 ? toStr(r[iDesc]) : null,
      purchaseDescription: iPurDesc >= 0 ? toStr(r[iPurDesc]) : null,
      salesDescription: iSalDesc >= 0 ? toStr(r[iSalDesc]) : null,
      defaultWarehouse: iWarehouse >= 0 ? toStr(r[iWarehouse]) : null,
      stockAccount: iStockAcc >= 0 ? toStr(r[iStockAcc]) : null,
      revenueAccount: iRevAcc >= 0 ? toStr(r[iRevAcc]) : null,
      expenseAccount: iExpAcc >= 0 ? toStr(r[iExpAcc]) : null,
      purchasePrice: iPurPrice >= 0 ? toNum(r[iPurPrice]) : 0,
      salePrice: iSalePrice >= 0 ? toNum(r[iSalePrice]) : 0,
      vatRate: iVat >= 0 ? toNum(r[iVat]) : 0,
      branchName: iBranch >= 0 ? toStr(r[iBranch]) : null,
      isActive: status ? !status.toLowerCase().includes('ngừng') : true,
    })
  }
  return out
}
