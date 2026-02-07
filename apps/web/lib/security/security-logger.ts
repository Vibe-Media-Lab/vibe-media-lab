/**
 * Security Event Logger
 *
 * 보안 이벤트(인증 실패, rate limit 초과, SSRF 차단 등)를 구조화하여 로깅
 */

import { getLogger } from '@/lib/logger'

const logger = getLogger('security')

export type SecurityEventType =
  | 'auth_failure'
  | 'rate_limited'
  | 'ssrf_blocked'
  | 'invalid_input'

export interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  ip?: string
  endpoint?: string
  details?: Record<string, unknown>
}

export function logSecurityEvent(event: SecurityEvent): void {
  const { type, ...rest } = event

  switch (type) {
    case 'auth_failure':
    case 'ssrf_blocked':
      logger.warn(`[${type}]`, rest)
      break
    case 'rate_limited':
      logger.warn(`[${type}]`, rest)
      break
    case 'invalid_input':
      logger.info(`[${type}]`, rest)
      break
    default:
      logger.info(`[${type}]`, rest)
  }
}
