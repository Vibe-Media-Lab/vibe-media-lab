/**
 * Kids Animation 액션 공통 유틸리티
 *
 * 각 step-action에서 공유하는 헬퍼 함수들.
 */

import { z } from 'zod'
import {
  asKidsContext,
  unwrapStepResult,
  DEFAULT_KIDS_SETUP,
} from '@/lib/api/kids-animation/types'
import type { StepActionContext } from '../types'

/** API 에러 응답에서 메시지 추출 */
export function extractErrorMessage(errorData: Record<string, unknown>, fallback: string): string {
  const error = errorData.error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const err = error as { message?: string; details?: { issues?: Array<{ path?: unknown[]; message?: string }> } }
    const message = err.message || fallback
    const issues = err.details?.issues
    if (issues && issues.length > 0) {
      const detail = issues.map((i) => `${(i.path || []).join('.')}: ${i.message}`).join(', ')
      return `${message} (${detail})`
    }
    return message
  }
  return fallback
}

/** 요청 데이터를 스키마로 사전 검증 */
export function validateRequestBody(body: unknown, schema: z.ZodSchema): void {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ')
    const more = result.error.issues.length > 5
      ? ` (외 ${result.error.issues.length - 5}개)`
      : ''
    throw new Error(`요청 데이터 검증 실패: ${issues}${more}`)
  }
}

/** Kids Animation 공통 요청 필드 빌드 */
export function buildBaseRequest(ctx: StepActionContext) {
  const kidsCtx = asKidsContext(ctx.inputContext)
  const setupData = kidsCtx.setup ?? DEFAULT_KIDS_SETUP
  const storyData = unwrapStepResult(kidsCtx.story)

  return {
    sessionId: ctx.sessionId || storyData?.sessionId || `session-${Date.now()}`,
    projectId: ctx.projectId || undefined,
    topic: setupData.topic,
    formFactor: setupData.formFactor || 'longform',
    style: setupData.style || 'pixar',
  }
}

/** 단순 fetch → JSON (story, script, shots, audio 등 공통 패턴) */
export async function simpleFetch(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(extractErrorMessage(errorData, `API 오류: ${response.status}`))
  }

  return response.json()
}
