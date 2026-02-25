/**
 * Myeongpan API 요청 스키마 (Zod)
 *
 * BirthProfileSchema는 core 패키지의 .refine() ESM export 문제를 피하기 위해
 * API 레이어에서 minimal 스키마로 재정의합니다.
 */

import { z } from 'zod'
import type { UnifiedChart, InterpretationResult } from '@vibe-media-lab/myeongpan-core'
import { ALLOWED_LLM_MODELS } from '@/lib/constants/model-options'

// ============================================================
// BirthProfile 스키마 (API용 minimal)
// ============================================================

export const BirthProfileRequestSchema = z.object({
  birthDateTimeLocal: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/,
      'ISO 로컬 시간 형식이어야 합니다 (예: 1992-10-24T05:30)'
    ),
  timezone: z.string().min(1, '시간대를 입력하세요'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    placeName: z.string().optional(),
  }),
  calendarMode: z.enum(['solar', 'lunar']),
  isLeapMonth: z.boolean().default(false),
  gender: z.enum(['male', 'female']),
  unknownTime: z.boolean().default(false),
  config: z
    .object({
      saju: z.object({ useLongitudeCorrection: z.boolean().optional() }).optional(),
      ziwei: z.object({ fixLeap: z.boolean().optional() }).optional(),
      western: z
        .object({
          houseSystem: z.enum(['placidus', 'koch', 'equal', 'whole-sign']).optional(),
        })
        .optional(),
    })
    .optional(),
})

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
