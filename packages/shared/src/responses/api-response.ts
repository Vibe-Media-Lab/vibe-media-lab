import { ApiError, type ErrorCode, type ErrorDetails } from '../errors/api-error.js'

export interface ApiResponseMeta {
  requestId?: string
  total?: number
  page?: number
  limit?: number
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: ApiResponseMeta
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: ErrorDetails
  }
  meta?: ApiResponseMeta
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function successResponse<T>(
  data: T,
  meta?: ApiResponseMeta
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  }
}

export function errorResponse(
  error: ApiError,
  meta?: ApiResponseMeta
): ApiErrorResponse {
  return {
    success: false,
    error: error.toJSON(),
    ...(meta && { meta }),
  }
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
  meta?: ApiResponseMeta
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    ...(meta && { meta }),
  }
}

export function paginatedResponse<T>(
  data: T[],
  options: {
    total: number
    page: number
    limit: number
    requestId?: string
  }
): ApiSuccessResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      total: options.total,
      page: options.page,
      limit: options.limit,
      ...(options.requestId && { requestId: options.requestId }),
    },
  }
}
