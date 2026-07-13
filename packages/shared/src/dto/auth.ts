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
