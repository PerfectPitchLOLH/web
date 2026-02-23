export type ApiSuccessResponse<T> = {
  success: true
  data: T
  metadata?: {
    timestamp: string
    requestId?: string
  }
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    timestamp: string
    requestId?: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export type PaginatedData<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type PaginationParams = {
  page?: number
  limit?: number
}

export type SortParams<T extends string = string> = {
  sortBy?: T
  sortOrder?: 'asc' | 'desc'
}

export type FilterParams = Record<string, string | number | boolean | undefined>
