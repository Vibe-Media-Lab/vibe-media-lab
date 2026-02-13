/**
 * Retry with Exponential Backoff + Jitter
 *
 * 외부 HTTP 1회 호출 단위 재시도 유틸리티
 * createTask 등 멱등키 없는 호출에는 사용하지 않음
 */

import { FetchTimeoutError } from './fetch-with-timeout'

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

/**
 * 재시도 가능한 에러인지 판별
 * 5xx, 429, 네트워크 에러, FetchTimeoutError
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError) return true

  if (error instanceof Error) {
    const msg = error.message
    // 네트워크 에러 (정확한 패턴 매칭)
    if (/fetch failed|network error|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(msg)) {
      return true
    }
  }

  // HTTP 에러 응답 (status가 포함된 커스텀 에러)
  const statusError = error as { status?: number; code?: number; statusCode?: number }
  const status = statusError.status || statusError.code || statusError.statusCode
  if (typeof status === 'number') {
    return status >= 500 || status === 429
  }

  return false
}

/**
 * 지수 백오프 + jitter 재시도
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = isRetryableError,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error
      }

      // 지수 백오프 + jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * 500
      const delayMs = Math.min(exponentialDelay + jitter, maxDelayMs)

      onRetry?.(error, attempt + 1, delayMs)

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
