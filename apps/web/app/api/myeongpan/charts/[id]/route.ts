import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler, errorJsonResponse } from '@/lib/api/api-handler'
import { ApiError } from '@vibe-media-lab/shared'
import {
  getChartWithInterpretation,
  deleteChart,
} from '@/lib/services/myeongpan-service'

const UuidSchema = z.string().uuid()

function extractChartId(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/')
  const chartsIdx = segments.indexOf('charts')
  const raw = chartsIdx >= 0 ? segments[chartsIdx + 1] : undefined
  const parsed = UuidSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

// GET /api/myeongpan/charts/[id]
export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const id = extractChartId(request)
    if (!id) {
      return errorJsonResponse(ApiError.badRequest('유효하지 않은 차트 ID입니다'))
    }

    const result = await getChartWithInterpretation(id, context.user.id)
    if (!result) {
      return errorJsonResponse(ApiError.notFound('차트를 찾을 수 없습니다'))
    }

    return NextResponse.json({ success: true, data: result })
  },
  { requireAuth: true, rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)

// DELETE /api/myeongpan/charts/[id]
export const DELETE = createApiHandler(
  async (request: NextRequest, context) => {
    const id = extractChartId(request)
    if (!id) {
      return errorJsonResponse(ApiError.badRequest('유효하지 않은 차트 ID입니다'))
    }

    await deleteChart(id, context.user.id)
    return NextResponse.json({ success: true })
  },
  { requireAuth: true, rateLimit: { maxRequests: 10, windowMs: 60_000 } }
)
