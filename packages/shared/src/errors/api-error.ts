import { ZodError } from 'zod'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_CREDITS'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR'

export interface ErrorDetails {
  issues?: Array<{ path: (string | number)[]; message: string }>
  provider?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly details?: ErrorDetails

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: ErrorDetails
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    Object.setPrototypeOf(this, ApiError.prototype)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }

  static badRequest(message: string, details?: ErrorDetails): ApiError {
    return new ApiError('VALIDATION_ERROR', message, 400, details)
  }

  static unauthorized(message = '인증이 필요합니다'): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message = '접근 권한이 없습니다'): ApiError {
    return new ApiError('FORBIDDEN', message, 403)
  }

  static notFound(message = '리소스를 찾을 수 없습니다'): ApiError {
    return new ApiError('NOT_FOUND', message, 404)
  }

  static rateLimited(message = '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요'): ApiError {
    return new ApiError('RATE_LIMITED', message, 429)
  }

  static insufficientCredits(message = '크레딧이 부족합니다'): ApiError {
    return new ApiError('INSUFFICIENT_CREDITS', message, 402)
  }

  static providerError(message: string, provider?: string): ApiError {
    return new ApiError('PROVIDER_ERROR', message, 502, { provider })
  }

  static internal(message = '서버 오류가 발생했습니다'): ApiError {
    return new ApiError('INTERNAL_ERROR', message, 500)
  }

  static fromZodError(error: ZodError): ApiError {
    const issues = error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }))

    return new ApiError('VALIDATION_ERROR', '입력값 검증에 실패했습니다', 400, {
      issues,
    })
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
