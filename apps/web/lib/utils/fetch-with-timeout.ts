/**
 * Fetch with Timeout
 *
 * AbortController 기반 fetch 타임아웃 유틸리티
 * 단일 HTTP 호출에만 적용 (폴링 루프에는 적용하지 않음)
 */

export class FetchTimeoutError extends Error {
  constructor(
    public url: string,
    public timeoutMs: number
  ) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`)
    this.name = 'FetchTimeoutError'
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, signal: existingSignal, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // 기존 signal이 있으면 연결 (caller가 abort하면 timeout controller도 abort)
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // caller가 abort한 경우 vs timeout인 경우 구분
      if (existingSignal?.aborted) {
        throw error
      }
      throw new FetchTimeoutError(url, timeoutMs)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
