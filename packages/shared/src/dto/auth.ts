// DTO xác thực (auth) — dùng chung FE ↔ BE.
import type { UserRole } from '../enums'

// Thông tin người dùng đã đăng nhập.
export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

// Kết quả POST /auth/login.
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// Kết quả POST /auth/refresh.
export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

// ── Quản lý người dùng (chỉ Admin) ──────────────────────────────────────────

// 1 dòng danh sách GET /users — không bao giờ trả passwordHash.
export interface UserListItem {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

// Body POST /users.
export interface CreateUserInput {
  email: string
  name: string
  role: UserRole
  password: string
}

// Body PATCH /users/:id — mọi field tùy chọn; password chỉ gửi khi đổi mật khẩu.
export interface UpdateUserInput {
  name?: string
  role?: UserRole
  isActive?: boolean
  password?: string
}
