// Type request/response dùng chung.

export * from './cash'
export * from './bank'
export * from './purchase'
export * from './sales'
export * from './inventory'
export * from './general'
export * from './dashboard'
export * from './catalog'
export * from './opening-balance'

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface Paginated<T> {
  data: T[]
  pagination: Pagination
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
}
