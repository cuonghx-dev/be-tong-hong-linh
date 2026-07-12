// Type request/response phân hệ Danh mục (05-danh-muc) — dùng chung FE ↔ BE.
import type {
  AccountNature,
  CostObjectType,
  IncomeExpenseType,
  ProductType,
  TransferSide,
} from '../enums'

// ── Vật tư, hàng hóa, dịch vụ ────────────────────────────────────────────────

export interface ProductDto {
  id: string
  code: string // Mã
  name: string // Tên
  type: ProductType // Tính chất
  groupCode: string | null // Nhóm VTHH (mã nhóm)
  unit: string | null // Đơn vị tính chính
  description: string | null // Mô tả
  purchaseDescription: string | null // Diễn giải khi mua
  saleDescription: string | null // Diễn giải khi bán
  defaultWarehouseCode: string | null // Mã kho ngầm định
  defaultWarehouseName: string | null // Kho ngầm định
  inventoryAccount: string | null // TK Kho
  revenueAccount: string | null // TK Doanh thu
  discountAccount: string | null // TK chiết khấu
  saleReturnAccount: string | null // TK Trả lại
  costAccount: string | null // TK chi phí
  purchasePrice: string | null // Đơn giá mua gần nhất (Decimal → string)
  salePrice: string | null // Đơn giá bán 1 (Decimal → string)
  minStock: string | null // Số lượng tồn tối thiểu (Decimal → string)
  vatRate: string | null // Thuế suất GTGT (10/8/KCT/…)
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateProductInput {
  code: string
  name: string
  type?: ProductType
  groupCode?: string | null
  unit?: string | null
  description?: string | null
  purchaseDescription?: string | null
  saleDescription?: string | null
  defaultWarehouseCode?: string | null
  defaultWarehouseName?: string | null
  inventoryAccount?: string | null
  revenueAccount?: string | null
  discountAccount?: string | null
  saleReturnAccount?: string | null
  costAccount?: string | null
  purchasePrice?: string | null
  salePrice?: string | null
  minStock?: string | null
  vatRate?: string | null
  isActive?: boolean
}

export type UpdateProductInput = Partial<CreateProductInput>

export interface ProductFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên / nhóm
  type?: ProductType
  isActive?: boolean
}

// ── Kho ──────────────────────────────────────────────────────────────────────

export interface WarehouseDto {
  id: string
  code: string // Mã kho
  name: string // Tên kho
  address: string | null // Địa chỉ
  branch: string | null // Chi nhánh
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateWarehouseInput {
  code: string
  name: string
  address?: string | null
  branch?: string | null
  isActive?: boolean
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>

export interface WarehouseFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên / địa chỉ / chi nhánh
  isActive?: boolean
}

// ── Nhân viên ────────────────────────────────────────────────────────────────

export interface EmployeeDto {
  id: string
  code: string // Mã nhân viên
  name: string // Tên nhân viên
  title: string | null // Chức danh
  department: string | null // Tên đơn vị (phòng ban)
  bankAccount: string | null // Số tài khoản
  bankName: string | null // Tên ngân hàng
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeInput {
  code: string
  name: string
  title?: string | null
  department?: string | null
  bankAccount?: string | null
  bankName?: string | null
  isActive?: boolean
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>

export interface EmployeeFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên / chức danh
  isActive?: boolean
}

// ── Nhóm khách hàng, nhà cung cấp ────────────────────────────────────────────

export interface PartnerGroupDto {
  id: string
  code: string // Mã nhóm KH, NCC
  name: string // Tên nhóm khách hàng, nhà cung cấp
  description: string | null // Diễn giải
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreatePartnerGroupInput {
  code: string
  name: string
  description?: string | null
  isActive?: boolean
}

export type UpdatePartnerGroupInput = Partial<CreatePartnerGroupInput>

export interface PartnerGroupFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên / diễn giải
  isActive?: boolean
}

// ── Ngân hàng ────────────────────────────────────────────────────────────────

export interface BankDto {
  id: string
  shortName: string // Tên viết tắt
  fullName: string // Tên đầy đủ
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateBankInput {
  shortName: string
  fullName: string
  isActive?: boolean
}

export type UpdateBankInput = Partial<CreateBankInput>

export interface BankFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo tên viết tắt / tên đầy đủ
  isActive?: boolean
}

// ── Tài khoản ngân hàng ──────────────────────────────────────────────────────

export interface BankAccountDto {
  id: string
  accountNumber: string // Số tài khoản
  bankName: string // Tên ngân hàng
  bankBranch: string | null // Tên chi nhánh ngân hàng
  accountHolder: string | null // Chủ tài khoản
  branch: string | null // Chi nhánh (đơn vị)
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateBankAccountInput {
  accountNumber: string
  bankName: string
  bankBranch?: string | null
  accountHolder?: string | null
  branch?: string | null
  isActive?: boolean
}

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>

export interface BankAccountFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo số TK / tên ngân hàng / chủ tài khoản
  isActive?: boolean
}

// ── Đối tượng tập hợp chi phí ────────────────────────────────────────────────

export interface CostObjectDto {
  id: string
  code: string // Mã đối tượng THCP
  name: string // Tên đối tượng THCP
  type: CostObjectType // Loại: Sản phẩm / Phân xưởng / Khác
  description: string | null // Diễn giải
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateCostObjectInput {
  code: string
  name: string
  type?: CostObjectType
  description?: string | null
  isActive?: boolean
}

export type UpdateCostObjectInput = Partial<CreateCostObjectInput>

export interface CostObjectFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên / diễn giải
  type?: CostObjectType
  isActive?: boolean
}

// ── Khoản mục chi phí ────────────────────────────────────────────────────────

export interface ExpenseItemDto {
  id: string
  code: string // Mã khoản mục chi phí
  name: string // Tên khoản mục chi phí
  description: string | null // Diễn giải
  parentId: string | null // Thuộc khoản mục (id cha)
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateExpenseItemInput {
  code: string
  name: string
  description?: string | null
  parentId?: string | null // '' / null = khoản mục gốc
  isActive?: boolean
}

export type UpdateExpenseItemInput = Partial<CreateExpenseItemInput>

export interface ExpenseItemFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên / diễn giải
  isActive?: boolean
}

// ── Hệ thống tài khoản ───────────────────────────────────────────────────────

export interface AccountDto {
  id: string
  number: string // Số tài khoản
  name: string // Tên tài khoản
  nature: AccountNature // Tính chất
  nameEn: string | null // Tên tiếng Anh
  description: string | null // Diễn giải
  parentId: string | null // Thuộc tài khoản (id cha)
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateAccountInput {
  number: string
  name: string
  nature: AccountNature
  nameEn?: string | null
  description?: string | null
  parentId?: string | null // '' / null = tài khoản gốc
  isActive?: boolean
}

export type UpdateAccountInput = Partial<CreateAccountInput>

export interface AccountFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo số TK / tên / tên tiếng Anh / diễn giải
  nature?: AccountNature
  isActive?: boolean
}

// ── Tài khoản kết chuyển ─────────────────────────────────────────────────────

export interface TransferAccountDto {
  id: string
  order: number // Thứ tự kết chuyển
  code: string // Mã kết chuyển (VD "511-911")
  fromAccount: string // Kết chuyển từ (mã TK)
  toAccount: string // Kết chuyển đến (mã TK)
  side: TransferSide // Bên kết chuyển: Nợ / Có / Hai bên
  description: string | null // Diễn giải
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateTransferAccountInput {
  order: number
  code: string
  fromAccount: string
  toAccount: string
  side?: TransferSide
  description?: string | null
  isActive?: boolean
}

export type UpdateTransferAccountInput = Partial<CreateTransferAccountInput>

export interface TransferAccountFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / TK từ / TK đến / diễn giải
  side?: TransferSide
  isActive?: boolean
}

// ── Loại chứng từ ────────────────────────────────────────────────────────────

export interface VoucherTypeDto {
  id: string
  code: string // Mã loại chứng từ (VD "PC")
  name: string // Tên loại chứng từ
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateVoucherTypeInput {
  code: string
  name: string
  isActive?: boolean
}

export type UpdateVoucherTypeInput = Partial<CreateVoucherTypeInput>

export interface VoucherTypeFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên loại chứng từ
  isActive?: boolean
}

// ── Mục thu/chi ──────────────────────────────────────────────────────────────

export interface IncomeExpenseItemDto {
  id: string
  code: string // Mã mục thu/chi
  name: string // Tên mục thu/chi
  type: IncomeExpenseType // Loại: Mục thu / Mục chi
  recurring: boolean // Phát sinh định kỳ
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateIncomeExpenseItemInput {
  code: string
  name: string
  type: IncomeExpenseType
  recurring?: boolean
  isActive?: boolean
}

export type UpdateIncomeExpenseItemInput = Partial<CreateIncomeExpenseItemInput>

export interface IncomeExpenseItemFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo mã / tên
  type?: IncomeExpenseType
  isActive?: boolean
}

// ── Tài khoản ngầm định ──────────────────────────────────────────────────────

export interface DefaultAccountDto {
  id: string
  order: number // STT trong danh sách MISA
  name: string // Loại nghiệp vụ (cột "Loại")
  debitAccount: string | null // TK Nợ ngầm định
  creditAccount: string | null // TK Có ngầm định
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateDefaultAccountInput {
  order?: number
  name: string
  debitAccount?: string | null
  creditAccount?: string | null
  isActive?: boolean
}

export type UpdateDefaultAccountInput = Partial<CreateDefaultAccountInput>

export interface DefaultAccountFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo loại nghiệp vụ / TK Nợ / TK Có
  isActive?: boolean
}

// ── Đơn vị tính ──────────────────────────────────────────────────────────────

export interface UnitDto {
  id: string
  name: string // Đơn vị tính (VD "Cái")
  description: string | null // Mô tả
  isActive: boolean // Trạng thái: Đang sử dụng / Ngừng sử dụng
  createdAt: string
  updatedAt: string
}

export interface CreateUnitInput {
  name: string
  description?: string | null
  isActive?: boolean
}

export type UpdateUnitInput = Partial<CreateUnitInput>

export interface UnitFilter {
  page?: number
  pageSize?: number
  keyword?: string // Tìm theo tên / mô tả đơn vị tính
  isActive?: boolean
}
