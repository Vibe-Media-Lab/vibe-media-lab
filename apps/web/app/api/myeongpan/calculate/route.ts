/**
 * POST /api/myeongpan/calculate
 *
 * 3체계 통합 차트 계산 + Supabase 저장
 *
 * - 크레딧: 1 소비 (동일 configHash 캐시 히트 시 0)
 * - maxDuration: 60s
 * - Rate limit: 20 req / 60s
 */

import { createApiHandler } from '@/lib/api'
import {
  CalculateRequestSchema,
  type CalculateResponse,
} from '@/lib/api/myeongpan/types'
import { calculateAndSaveChart } from '@/lib/services/myeongpan-service'
import type { BirthProfile } from '@vibe-media-lab/myeongpan-core'

export const maxDuration = 60

export const POST = createApiHandler<CalculateResponse>(
  async (request, context) => {
    const body = await request.json()
    const validated = CalculateRequestSchema.parse(body)

    const { chartId, chart } = await calculateAndSaveChart(
      validated as BirthProfile,
      context.user.id
    )

    return { chartId, chart }
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)
