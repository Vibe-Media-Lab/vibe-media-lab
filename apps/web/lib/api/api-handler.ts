import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
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
  options: CreateApiHandlerOptions = { requireAuth: true }
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const requestContext = await getRequestContext()
    const { requestId } = requestContext

    try {
      const supabase = await createClient()

      if (options.requireAuth) {
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
