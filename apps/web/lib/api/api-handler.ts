import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import {
  ApiError,
  handleError,
  successResponse,
  errorResponse,
  type ApiSuccessResponse,
} from '@vibe-media-lab/shared'
import { RateLimiter } from '@vibe-media-lab/media-router'
import type { User } from '@supabase/supabase-js'
import { getRequestContext, type RequestContext } from './request-context'
import { logSecurityEvent } from '@/lib/security/security-logger'

export interface ApiHandlerContext extends RequestContext {
  user: User
}

export type ApiHandlerFn<T> = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<T | NextResponse>

export interface CreateApiHandlerOptions {
  requireAuth?: boolean
  rateLimit?: { maxRequests: number; windowMs: number }
}

// 모듈 레벨 limiter 캐시 (action별 인스턴스)
const rateLimiters = new Map<string, RateLimiter>()

function getRateLimiter(key: string, config: { maxRequests: number; windowMs: number }): RateLimiter {
  let limiter = rateLimiters.get(key)
  if (!limiter) {
    limiter = new RateLimiter(config)
    rateLimiters.set(key, limiter)
  }
  return limiter
}

export function createApiHandler<T>(
  handler: ApiHandlerFn<T>,
  options: CreateApiHandlerOptions = {},
): (request: NextRequest) => Promise<NextResponse> {
  // requireAuth는 명시적으로 false 전달하지 않는 한 항상 true
  const requireAuth = options.requireAuth !== false

  return async (request: NextRequest) => {
    const requestContext = await getRequestContext()
    const { requestId } = requestContext
    const endpoint = request.nextUrl.pathname
    const startTime = Date.now()

    // Sentry breadcrumb: 요청 시작
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${request.method} ${endpoint}`,
      data: { requestId, endpoint },
      level: 'info',
    })

    try {
      const supabase = await createClient()

      if (requireAuth) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          logSecurityEvent({
            type: 'auth_failure',
            ip: requestContext.ip,
            endpoint: request.nextUrl.pathname,
          })
          const error = ApiError.unauthorized()
          return NextResponse.json(
            errorResponse(error, { requestId }),
            { status: error.statusCode }
          )
        }

        // Rate limiting (user.id 기반)
        if (options.rateLimit) {
          const endpoint = request.nextUrl.pathname
          const limiter = getRateLimiter(endpoint, options.rateLimit)
          const result = limiter.check(user.id)

          if (!result.allowed) {
            logSecurityEvent({
              type: 'rate_limited',
              userId: user.id,
              ip: requestContext.ip,
              endpoint,
              details: { retryAfterMs: result.retryAfterMs },
            })
            const error = ApiError.rateLimited()
            const headers: Record<string, string> = {
              'Retry-After': String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            }
            return NextResponse.json(
              errorResponse(error, { requestId }),
              { status: error.statusCode, headers }
            )
          }
        }

        const result = await handler(request, {
          ...requestContext,
          user,
        })

        if (result instanceof NextResponse) {
          return result
        }

        return NextResponse.json(
          successResponse(result, { requestId }) as ApiSuccessResponse<T>
        )
      }

      const { data: { user } } = await supabase.auth.getUser()

      const result = await handler(request, {
        ...requestContext,
        user: user!,
      })

      if (result instanceof NextResponse) {
        return result
      }

      return NextResponse.json(
        successResponse(result, { requestId }) as ApiSuccessResponse<T>
      )
    } catch (error) {
      const elapsedMs = Date.now() - startTime

      if (error instanceof ZodError) {
        console.error(`[${requestId}] Validation error:`, JSON.stringify(error.errors, null, 2))
        const apiError = ApiError.fromZodError(error)
        return NextResponse.json(
          errorResponse(apiError, { requestId }),
          { status: apiError.statusCode }
        )
      }

      const { error: apiError, shouldLog } = handleError(error, { requestId })

      if (shouldLog) {
        console.error(`[${requestId}] Unhandled error:`, error)
      }

      // Sentry 에러 보고 (예외 경계 지점에서만)
      Sentry.withScope((scope) => {
        scope.setTag('endpoint', endpoint)
        scope.setTag('requestId', requestId)
        scope.setTag('errorCode', apiError.code)
        scope.setExtra('elapsedMs', elapsedMs)
        scope.setExtra('statusCode', apiError.statusCode)
        Sentry.captureException(error)
      })

      return NextResponse.json(
        errorResponse(apiError, { requestId }),
        { status: apiError.statusCode }
      )
    }
  }
}

export function jsonResponse<T>(
  data: T,
  meta?: { requestId?: string }
): NextResponse {
  return NextResponse.json(successResponse(data, meta))
}

export function errorJsonResponse(
  error: ApiError,
  meta?: { requestId?: string }
): NextResponse {
  return NextResponse.json(
    errorResponse(error, meta),
    { status: error.statusCode }
  )
}
