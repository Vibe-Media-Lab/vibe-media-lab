import { ZodError } from 'zod'
import { ApiError, isApiError } from './api-error.js'

export interface HandleErrorOptions {
  logger?: {
    error: (message: string, context?: Record<string, unknown>) => void
  }
  requestId?: string
}

export interface ErrorResult {
  error: ApiError
  shouldLog: boolean
}

export function handleError(
  error: unknown,
  options: HandleErrorOptions = {}
): ErrorResult {
  const { logger, requestId } = options

  if (isApiError(error)) {
    const shouldLog = error.statusCode >= 500

    if (shouldLog && logger) {
      logger.error(error.message, {
        code: error.code,
        details: error.details,
        requestId,
      })
    }

    return { error, shouldLog }
  }

  if (error instanceof ZodError) {
    const apiError = ApiError.fromZodError(error)
    return { error: apiError, shouldLog: false }
  }

  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
  const apiError = ApiError.internal(message)

  if (logger) {
    logger.error('Unhandled error', {
      message,
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    })
  }

  return { error: apiError, shouldLog: true }
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }

  if (error instanceof ZodError) {
    return '입력값 검증에 실패했습니다'
  }

  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다'
}
