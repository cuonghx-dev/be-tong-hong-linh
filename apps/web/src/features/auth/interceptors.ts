import type { RefreshResponse } from '@app/shared'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { api } from '@/shared/lib/api'
import { useAuth } from './store'

// Endpoint auth công khai — 401 ở đây không kích hoạt refresh.
const AUTH_PATHS = ['/auth/login', '/auth/refresh']

// Dedupe: nhiều request 401 cùng lúc chỉ gọi refresh 1 lần.
let refreshing: Promise<RefreshResponse> | null = null

async function refreshTokens(): Promise<RefreshResponse> {
  const { refreshToken } = useAuth.getState()
  if (!refreshToken) throw new Error('Không có refresh token')
  // Dùng axios trần (không interceptor) để tránh loop 401 → refresh → 401…
  const res = await axios.post<RefreshResponse>(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
  )
  useAuth.getState().setTokens(res.data)
  return res.data
}

// Gắn interceptor xác thực vào api instance dùng chung. Gọi 1 lần khi khởi động app.
export function setupAuthInterceptors() {
  api.interceptors.request.use((config) => {
    const token = useAuth.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  api.interceptors.response.use(
    (res) => res,
    async (err: AxiosError) => {
      const config = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
      const isAuthPath = AUTH_PATHS.some((p) => config?.url?.includes(p))
      if (err.response?.status !== 401 || !config || config._retry || isAuthPath) {
        return Promise.reject(err)
      }
      config._retry = true
      try {
        refreshing ??= refreshTokens().finally(() => {
          refreshing = null
        })
        const { accessToken } = await refreshing
        config.headers.Authorization = `Bearer ${accessToken}`
        return api(config)
      } catch {
        // Refresh fail → phiên hết hạn: đăng xuất, quay về trang đăng nhập.
        useAuth.getState().logout()
        window.location.assign('/login')
        return Promise.reject(err)
      }
    },
  )
}
