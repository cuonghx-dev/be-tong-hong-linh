// Type request/response dùng chung.

export * from './cash'
export * from './cash-report'
export * from './bank'
export * from './bank-report'
export * from './purchase'
export * from './purchase-report'
export * from './sales'
export * from './sales-report'
export * from './inventory'
export * from './inventory-report'
export * from './general'
export * from './report'
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
