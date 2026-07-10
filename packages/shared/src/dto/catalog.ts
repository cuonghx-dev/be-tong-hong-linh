// Type request/response phân hệ Danh mục (05-danh-muc) — dùng chung FE ↔ BE.

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
