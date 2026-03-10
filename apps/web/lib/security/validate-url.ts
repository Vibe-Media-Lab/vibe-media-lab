/**
 * SSRF URL Validation
 *
 * 원격 URL fetch 전 SSRF 공격을 방어하기 위한 검증 유틸리티
 * - HTTPS만 허용
 * - 내부 IP/호스트 차단
 * - 허용 도메인 화이트리스트 적용
 */

import { logSecurityEvent } from './security-logger'

const ALLOWED_HOST_PATTERNS = [
  /\.supabase\.co$/,
  /^storage\.googleapis\.com$/,
  /\.kie\.ai$/,
  /(?:^|\.)aiquickdraw\.com$/,
  /\.googleusercontent\.com$/,
  /\.suno\.ai$/,
  /\.fal\.ai$/,
  /\.fal\.media$/,
]

const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
]

const BLOCKED_HOSTNAMES = ['localhost', '0.0.0.0', '[::1]']

export class SSRFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSRFError'
  }
}

/**
 * 원격 URL이 안전한지 검증
 *
 * @throws SSRFError URL이 안전하지 않은 경우
 */
export function validateFetchUrl(url: string, context?: { endpoint?: string; userId?: string }): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    logSecurityEvent({
      type: 'ssrf_blocked',
      details: { reason: 'invalid_url', url: url.slice(0, 100) },
      ...context,
    })
    throw new SSRFError(`Invalid URL: ${url.slice(0, 100)}`)
  }

  // HTTPS만 허용
  if (parsed.protocol !== 'https:') {
    logSecurityEvent({
      type: 'ssrf_blocked',
      details: { reason: 'non_https', protocol: parsed.protocol, host: parsed.hostname },
      ...context,
    })
    throw new SSRFError(`Only HTTPS URLs are allowed, got: ${parsed.protocol}`)
  }

  const hostname = parsed.hostname.toLowerCase()

  // 차단된 호스트명 확인
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    logSecurityEvent({
      type: 'ssrf_blocked',
      details: { reason: 'blocked_hostname', hostname },
      ...context,
    })
    throw new SSRFError(`Blocked hostname: ${hostname}`)
  }

  // 내부 IP 패턴 확인
  const isBlockedIp = BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(hostname))
  if (isBlockedIp) {
    logSecurityEvent({
      type: 'ssrf_blocked',
      details: { reason: 'internal_ip', hostname },
      ...context,
    })
    throw new SSRFError(`Internal IP addresses are not allowed: ${hostname}`)
  }

  // 화이트리스트 확인
  const isAllowed = ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(hostname))
  if (!isAllowed) {
    logSecurityEvent({
      type: 'ssrf_blocked',
      details: { reason: 'not_whitelisted', hostname },
      ...context,
    })
    throw new SSRFError(`Host not in whitelist: ${hostname}`)
  }
}
