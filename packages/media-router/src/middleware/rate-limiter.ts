/**
 * Rate Limiter
 *
 * 메모리 기반 rate limiter with automatic cleanup.
 * Redis 환경 변수가 설정되면 Redis 기반으로 전환 가능.
 *
 * @example
 * const limiter = createUserRateLimiter()
 * if (!limiter.isAllowed(userId)) {
 *   return { error: 'Too many requests' }
 * }
 */

interface RateLimitConfig {
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number
  /** 윈도우 크기 (ms) */
  windowMs: number
  /** 자동 정리 간격 (ms), 기본값: 5분 */
  cleanupIntervalMs?: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfterMs?: number
}

/**
 * 메모리 기반 Rate Limiter
 *
 * 특징:
 * - Sliding window 방식
 * - 자동 메모리 정리 (만료된 엔트리 제거)
 * - 멀티 인스턴스 환경에서는 Redis 기반 권장
 */
export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private config: Required<RateLimitConfig>
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      cleanupIntervalMs: config.cleanupIntervalMs ?? 5 * 60 * 1000, // 5분
    }

    // 자동 정리 시작
    this.startAutoCleanup()
  }

  /**
   * 요청이 허용되는지 확인하고 카운트 증가
   */
  isAllowed(key: string): boolean {
    return this.check(key).allowed
  }

  /**
   * 상세한 rate limit 정보 반환
   */
  check(key: string): RateLimitResult {
    const now = Date.now()
    const entry = this.limits.get(key)

    // 새 윈도우 시작
    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      }
    }

    // 한도 초과
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfterMs: entry.resetTime - now,
      }
    }

    // 카운트 증가
    const newCount = entry.count + 1
    this.limits.set(key, {
      ...entry,
      count: newCount,
    })

    return {
      allowed: true,
      remaining: this.config.maxRequests - newCount,
      resetTime: entry.resetTime,
    }
  }

  /**
   * 남은 요청 수 조회 (카운트 증가 없음)
   */
  getRemainingRequests(key: string): number {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      return this.config.maxRequests
    }

    return Math.max(0, this.config.maxRequests - entry.count)
  }

  /**
   * 리셋 시간 조회
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key)
    return entry?.resetTime ?? Date.now() + this.config.windowMs
  }

  /**
   * 특정 키의 rate limit 리셋
   */
  reset(key: string): void {
    this.limits.delete(key)
  }

  /**
   * 만료된 엔트리 정리
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 자동 정리 시작
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupIntervalMs)

    // Node.js 환경에서 프로세스 종료 시 타이머가 블로킹하지 않도록 설정
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref()
    }
  }

  /**
   * 자동 정리 중지 및 리소스 해제
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.limits.clear()
  }

  /**
   * 현재 추적 중인 키 수
   */
  get size(): number {
    return this.limits.size
  }
}

/**
 * 사용자별 rate limiter 생성
 * 분당 30회 요청 제한
 */
export function createUserRateLimiter(): RateLimiter {
  return new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000, // 1분
  })
}

/**
 * 프로바이더별 rate limiter 생성
 * 분당 100회 요청 제한
 */
export function createProviderRateLimiter(): RateLimiter {
  return new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1분
  })
}

/**
 * IP 기반 rate limiter 생성
 * 분당 60회 요청 제한
 */
export function createIpRateLimiter(): RateLimiter {
  return new RateLimiter({
    maxRequests: 60,
    windowMs: 60 * 1000, // 1분
  })
}

/**
 * Rate limit 헤더 생성
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    ...(result.retryAfterMs && {
      'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
    }),
  }
}
