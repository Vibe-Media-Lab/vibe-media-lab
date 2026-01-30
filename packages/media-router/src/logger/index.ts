export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string
  runId?: string
  userId?: string
  provider?: string
  mediaType?: string
  latencyMs?: number
  cost?: number
  error?: string
  context?: Record<string, unknown>
}

export interface LogContext {
  requestId?: string
  runId?: string
  userId?: string
  provider?: string
  mediaType?: string
  [key: string]: unknown
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

export interface LoggerConfig {
  minLevel?: LogLevel
  context?: LogContext
  jsonOutput?: boolean
}

export class MediaRouterLogger implements Logger {
  private minLevel: LogLevel
  private entries: LogEntry[] = []
  private context: LogContext
  private jsonOutput: boolean

  constructor(config: LoggerConfig = {}) {
    this.minLevel = config.minLevel || 'info'
    this.context = config.context || {}
    this.jsonOutput = config.jsonOutput ?? process.env.NODE_ENV === 'production'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private formatEntry(entry: LogEntry): string {
    if (this.jsonOutput) {
      return JSON.stringify(entry)
    }

    const { timestamp, level, message, context, ...meta } = entry
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    const ctxStr = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${ctxStr}`
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(context && { context }),
    }

    this.entries.push(entry)

    const output = this.formatEntry(entry)
    const logMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'

    // eslint-disable-next-line no-console
    console[logMethod](output)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }

  withContext(context: LogContext): MediaRouterLogger {
    return new MediaRouterLogger({
      minLevel: this.minLevel,
      jsonOutput: this.jsonOutput,
      context: {
        ...this.context,
        ...context,
      },
    })
  }

  withRequestId(requestId: string): MediaRouterLogger {
    return this.withContext({ requestId })
  }

  child(context: LogContext): MediaRouterLogger {
    return this.withContext(context)
  }

  getEntries(): LogEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries = []
  }

  setJsonOutput(enabled: boolean): void {
    this.jsonOutput = enabled
  }
}

let loggerInstance: MediaRouterLogger | null = null

export function getLogger(): MediaRouterLogger {
  if (!loggerInstance) {
    const minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
    const jsonOutput = process.env.NODE_ENV === 'production'
    loggerInstance = new MediaRouterLogger({ minLevel, jsonOutput })
  }
  return loggerInstance
}

export function createLogger(config?: LoggerConfig): MediaRouterLogger {
  return new MediaRouterLogger(config)
}
