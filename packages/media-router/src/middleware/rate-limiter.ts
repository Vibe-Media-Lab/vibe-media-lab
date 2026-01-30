interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { maxRequests: 60, windowMs: 60000 }) {
    this.config = config
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      })
      return true
    }

    if (entry.count >= this.config.maxRequests) {
      return false
    }

    this.limits.set(key, {
      ...entry,
      count: entry.count + 1,
    })
    return true
  }

  getRemainingRequests(key: string): number {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      return this.config.maxRequests
    }

    return Math.max(0, this.config.maxRequests - entry.count)
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key)
    return entry?.resetTime || Date.now() + this.config.windowMs
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key)
      }
    }
  }
}

export function createUserRateLimiter() {
  return new RateLimiter({ maxRequests: 30, windowMs: 60000 })
}

export function createProviderRateLimiter() {
  return new RateLimiter({ maxRequests: 100, windowMs: 60000 })
}
