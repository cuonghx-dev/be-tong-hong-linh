// Type request/response dùng chung.

export * from './cash'

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
