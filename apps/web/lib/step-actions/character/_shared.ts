/**
 * Character Creator 액션 공통 유틸리티
 */

import {
  asCharacterContext,
  unwrapStepResult,
} from '@/lib/api/character/types'
import type { StepActionContext } from '../types'

// 제네릭 유틸은 kids에서 재사용
export { extractErrorMessage, validateRequestBody, simpleFetch } from '../kids/_shared'

/** Character Creator 공통 요청 필드 빌드 */
export function buildCharacterBaseRequest(ctx: StepActionContext) {
  return {
    sessionId: ctx.sessionId || `session-${Date.now()}`,
    projectId: ctx.projectId || undefined,
  }
}

/** Character context 유틸 re-export */
export { asCharacterContext, unwrapStepResult }
