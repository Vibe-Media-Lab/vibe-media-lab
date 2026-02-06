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
import type { User } from '@supabase/supabase-js'
import { getRequestContext, type RequestContext } from './request-context'

export interface ApiHandlerContext extends RequestContext {
  user: User
}

export type ApiHandlerFn<T> = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<T | NextResponse>

export interface CreateApiHandlerOptions {
  requireAuth?: boolean
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
          const error = ApiError.unauthorized()
          return NextResponse.json(
            errorResponse(error, { requestId }),
            { status: error.statusCode }
          )
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
