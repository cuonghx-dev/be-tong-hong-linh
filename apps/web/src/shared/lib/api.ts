import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

// Lấy message lỗi từ API (NestJS trả { message: string | string[] }) để hiện toast.
export function getApiErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi, thử lại sau.') {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message)) return message.join('; ')
    if (typeof message === 'string') return message
  }
  return fallback
}

// TODO: gắn access token + refresh flow (401 → refresh → retry).
// api.interceptors.request.use((config) => {
//   const token = getAccessToken()
//   if (token) config.headers.Authorization = `Bearer ${token}`
//   return config
// })
