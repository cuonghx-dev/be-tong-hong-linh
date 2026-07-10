// Type request/response phân hệ Danh mục (05-danh-muc) — dùng chung FE ↔ BE.
import type { CostObjectType } from '../enums'

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
