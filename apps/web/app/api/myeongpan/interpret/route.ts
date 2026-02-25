/**
 * POST /api/myeongpan/interpret
 *
 * UnifiedChart → LLM 3체계 통합 풀이 생성
 *
 * - chartId 전달: DB에서 차트 조회 → 해석
 * - birthProfile 전달: 원스텝 (calculate + interpret)
 * - 크레딧: 1 소비
 * - maxDuration: 90s (LLM 포함)
 * - Rate limit: 5 req / 60s
 */

import { createApiHandler } from '@/lib/api'
import { ApiError } from '@vibe-media-lab/shared'
import {
  InterpretRequestSchema,
  type InterpretResponse,
} from '@/lib/api/myeongpan/types'
import {
  calculateAndSaveChart,
  interpretChart,
  saveInterpretation,
  getChartById,
  mergeOptions,
} from '@/lib/services/myeongpan-service'
import type { BirthProfile, InterpretationOptions, UnifiedChart } from '@vibe-media-lab/myeongpan-core'

export const maxDuration = 90

export const POST = createApiHandler<InterpretResponse>(
  async (request, context) => {
    const body = await request.json()
    const validated = InterpretRequestSchema.parse(body)

    let chartId: string
    let chart: UnifiedChart

    if (validated.chartId) {
      // 기존 차트 조회
      const found = await getChartById(validated.chartId, context.user.id)
      if (!found) {
        throw ApiError.notFound('차트를 찾을 수 없습니다')
      }
      chartId = validated.chartId
      chart = found.chart
    } else {
      // 원스텝: calculate + interpret
      const result = await calculateAndSaveChart(
        validated.birthProfile as BirthProfile,
        context.user.id
      )
      chartId = result.chartId
      chart = result.chart
    }

    // 해석 옵션 구성
    const options: Partial<InterpretationOptions> = {}
    if (validated.options?.tone) options.tone = validated.options.tone
    if (validated.options?.length) options.length = validated.options.length
    if (validated.options?.topics) options.topics = validated.options.topics

    // LLM 해석
    const interpretation = await interpretChart(chart, options)

    // 결과 저장
    await saveInterpretation(chartId, context.user.id, interpretation, mergeOptions(options))

    return interpretation
  },
  { rateLimit: { maxRequests: 5, windowMs: 60_000 } }
)
