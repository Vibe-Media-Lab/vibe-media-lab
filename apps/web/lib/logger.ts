/**
 * 구조화된 로거
 *
 * 프로덕션 환경에서 민감한 정보 노출을 방지하고
 * 개발 환경에서 디버깅을 용이하게 합니다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface Logger {
  debug: (message: string, context?: LogContext) => void
  info: (message: string, context?: LogContext) => void
  warn: (message: string, context?: LogContext) => void
  error: (message: string, context?: LogContext) => void
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const isProduction = process.env.NODE_ENV === 'production'
const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (isProduction ? 'info' : 'debug')

/**
 * 민감한 정보를 마스킹합니다.
 */
function sanitizeContext(context: LogContext): LogContext {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'cookie']

  const sanitized: LogContext = {}

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk))

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = value.length > 4 ? `${value.slice(0, 2)}***${value.slice(-2)}` : '***'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as LogContext)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
}

function formatLog(level: LogLevel, namespace: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const sanitizedContext = context ? sanitizeContext(context) : undefined

  if (isProduction) {
    // JSON 형식 (프로덕션 - 로그 수집기 친화적)
    return JSON.stringify({
      timestamp,
      level,
      namespace,
      message,
      ...(sanitizedContext && { context: sanitizedContext }),
    })
  }

  // 읽기 쉬운 형식 (개발)
  const contextStr = sanitizedContext ? ` ${JSON.stringify(sanitizedContext)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] [${namespace}] ${message}${contextStr}`
}

function log(level: LogLevel, namespace: string, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return
  }

  const formattedLog = formatLog(level, namespace, message, context)

  switch (level) {
    case 'error':
      console.error(formattedLog)
      break
    case 'warn':
      console.warn(formattedLog)
      break
    default:
      console.log(formattedLog)
  }
}

/**
 * 네임스페이스가 지정된 로거를 생성합니다.
 *
 * @example
 * const logger = getLogger('auth-callback')
 * logger.info('User authenticated', { userId: user.id })
 * logger.error('Authentication failed', { error: err.message })
 */
export function getLogger(namespace: string): Logger {
  return {
    debug: (message: string, context?: LogContext) => log('debug', namespace, message, context),
    info: (message: string, context?: LogContext) => log('info', namespace, message, context),
    warn: (message: string, context?: LogContext) => log('warn', namespace, message, context),
    error: (message: string, context?: LogContext) => log('error', namespace, message, context),
  }
}

/**
 * 기본 로거 (네임스페이스: 'app')
 */
export const logger = getLogger('app')
