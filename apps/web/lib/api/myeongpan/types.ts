/**
 * Myeongpan API 요청 스키마 (Zod)
 *
 * 스키마 정의는 core 패키지(@vibe-media-lab/myeongpan-core)가 단일 소스.
 * API 레이어에서는 isLeapMonth/unknownTime에 기본값(.default)을 추가하고
 * 동일 refine 검증을 적용합니다.
 */

import { z } from 'zod'
import { BirthProfileBaseSchema } from '@vibe-media-lab/myeongpan-core'
import type { UnifiedChart, InterpretationResult } from '@vibe-media-lab/myeongpan-core'
import { ALLOWED_LLM_MODELS } from '@/lib/constants/model-options'

// ============================================================
// BirthProfile 스키마 (API용 — core BaseSchema + default 값)
// ============================================================

export const BirthProfileRequestSchema = BirthProfileBaseSchema
  .extend({
    isLeapMonth: z.boolean().default(false),
    unknownTime: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const [datePart] = data.birthDateTimeLocal.split('T')
      const [y, m, d] = datePart!.split('-').map(Number)
      const date = new Date(y!, m! - 1, d!)
      return date.getFullYear() === y && date.getMonth() === m! - 1 && date.getDate() === d
    },
    { message: '실존하지 않는 날짜입니다', path: ['birthDateTimeLocal'] },
  )
  .refine(
    (data) => {
      const year = parseInt(data.birthDateTimeLocal.substring(0, 4), 10)
      return year >= 1900 && year <= 2050
    },
    { message: '연도는 1900~2050 범위만 지원합니다', path: ['birthDateTimeLocal'] },
  )

// ============================================================
// Calculate 요청
// ============================================================

export const CalculateRequestSchema = BirthProfileRequestSchema

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>

// ============================================================
// Interpret 요청
// ============================================================

export const InterpretRequestSchema = z
  .object({
    chartId: z.string().uuid().optional(),
    birthProfile: BirthProfileRequestSchema.optional(),
    model: z.enum(ALLOWED_LLM_MODELS).optional(),
    options: z
      .object({
        tone: z.enum(['warm', 'neutral', 'professional']).default('warm'),
        length: z.enum(['short', 'medium', 'long']).default('medium'),
        topics: z
          .array(z.enum(['personality', 'career', 'relationships', 'health', 'wealth', 'timing']))
          .optional(),
      })
      .optional(),
  })
  .refine((data) => data.chartId || data.birthProfile, {
    message: 'chartId 또는 birthProfile 중 하나는 필수입니다',
  })

export type InterpretRequest = z.infer<typeof InterpretRequestSchema>

// ============================================================
// 응답 타입
// ============================================================

export interface CalculateResponse {
  chartId: string
  chart: UnifiedChart
}

export type InterpretResponse = InterpretationResult
