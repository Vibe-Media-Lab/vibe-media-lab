import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiError, errorResponse } from '@vibe-media-lab/shared'
import type { User } from '@supabase/supabase-js'
import { getRequestContext, type RequestContext } from './request-context'

export interface AuthenticatedContext extends RequestContext {
  user: User
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthenticatedContext
) => Promise<NextResponse | Response>

export type UnauthenticatedHandler = (
  request: NextRequest,
  context: RequestContext
) => Promise<NextResponse | Response>

export function withAuth(handler: AuthenticatedHandler): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const requestContext = await getRequestContext()

    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        const error = ApiError.unauthorized()
        return NextResponse.json(
          errorResponse(error, { requestId: requestContext.requestId }),
          { status: error.statusCode }
        )
      }

      const response = await handler(request, {
        ...requestContext,
        user,
      })

      return response instanceof NextResponse ? response : NextResponse.json(response)
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          errorResponse(error, { requestId: requestContext.requestId }),
          { status: error.statusCode }
        )
      }
      throw error
    }
  }
}

export function withOptionalAuth(handler: (
  request: NextRequest,
  context: RequestContext & { user?: User }
) => Promise<NextResponse | Response>): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const requestContext = await getRequestContext()

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const response = await handler(request, {
        ...requestContext,
        user: user || undefined,
      })

      return response instanceof NextResponse ? response : NextResponse.json(response)
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          errorResponse(error, { requestId: requestContext.requestId }),
          { status: error.statusCode }
        )
      }
      throw error
    }
  }
}
