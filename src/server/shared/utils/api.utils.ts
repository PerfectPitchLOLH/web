import { NextResponse } from 'next/server'

import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
} from '../constants/http.constants'
import type { ApiErrorResponse, ApiSuccessResponse } from '../types'

type ResponseMetadata = {
  timestamp: string
  requestId?: string
}

const createMetadata = (): ResponseMetadata => ({
  timestamp: new Date().toISOString(),
})

export const createSuccessResponse = <T>(
  data: T,
  status: number = HTTP_STATUS.OK,
): NextResponse<ApiSuccessResponse<T>> => {
  return NextResponse.json(
    {
      success: true,
      data,
      metadata: createMetadata(),
    },
    { status },
  )
}

export const createErrorResponse = (
  code: keyof typeof ERROR_CODES,
  message?: string,
  details?: unknown,
  status: number = HTTP_STATUS.BAD_REQUEST,
): NextResponse<ApiErrorResponse> => {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: ERROR_CODES[code],
        message: message || ERROR_MESSAGES[code],
        details,
      },
      metadata: createMetadata(),
    },
    { status },
  )
}

export class ApiError extends Error {
  constructor(
    public code: keyof typeof ERROR_CODES,
    public statusCode: number,
    message?: string,
    public details?: unknown,
  ) {
    super(message || ERROR_MESSAGES[code])
    this.name = 'ApiError'
  }
}

export const handleApiError = (
  error: unknown,
): NextResponse<ApiErrorResponse> => {
  if (error instanceof ApiError) {
    return createErrorResponse(
      error.code,
      error.message,
      error.details,
      error.statusCode,
    )
  }

  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'ZodError'
  ) {
    return createErrorResponse(
      'VALIDATION_ERROR',
      'Validation failed',
      (error as any).errors,
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  // eslint-disable-next-line no-console
  console.error('Unexpected error:', error)
  return createErrorResponse(
    'INTERNAL_ERROR',
    undefined,
    undefined,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  )
}
