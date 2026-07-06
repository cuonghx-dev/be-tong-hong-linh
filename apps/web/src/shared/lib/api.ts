import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

// TODO: gắn access token + refresh flow (401 → refresh → retry).
// api.interceptors.request.use((config) => {
//   const token = getAccessToken()
//   if (token) config.headers.Authorization = `Bearer ${token}`
//   return config
// })
