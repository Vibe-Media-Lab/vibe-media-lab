/**
 * StepAction 인터페이스 + 콜백 타입 정의
 *
 * 각 파이프라인 단계(story, script, expand 등)의 비즈니스 로직을
 * generation-review-step.tsx에서 분리하기 위한 계약.
 */

import type { GenerationProgress } from '@vibe-media-lab/shared'
import type { GenerationResult, StepStatus } from '@/components/templates/workflow/steps/generation-review/types'
import type { z } from 'zod'

/** 컴포넌트가 StepAction에 넘기는 상태 제어 콜백 */
export interface StepCallbacks {
  setStatus: (status: StepStatus) => void
  setProgress: (updater: (prev: GenerationProgress) => GenerationProgress) => void
  setError: (error: string | null) => void
  onChange: (value: GenerationResult | null) => void
  setCompletedUrls: (updater: (prev: Record<string, string>) => Record<string, string>) => void
}

/** StepAction에 전달되는 컨텍스트 */
export interface StepActionContext {
  inputContext: Record<string, unknown>
  sessionId: string
  projectId: string | null
  selectedModel?: string
  selectedSecondaryModel?: string
  stepId: string
  value: GenerationResult | null
  config: { batchSize?: number; previewType: string; generateAction: string }
  // audio 전용
  regenerateMode?: boolean
  selectedForRegenerate?: Set<string>
  selectedBgmIndex?: number
}

/** 모든 step action이 구현하는 계약 */
export interface StepAction {
  readonly actionKey: string
  readonly endpoint: string
  readonly requestSchema: z.ZodSchema | null

  buildRequestBody(ctx: StepActionContext): Record<string, unknown>
  execute(ctx: StepActionContext, callbacks: StepCallbacks): Promise<void>

  /** 선택적: shots/videos 개별 재생성 */
  regenerateItem?(
    itemId: string,
    editedPrompt: string | undefined,
    ctx: StepActionContext,
    callbacks: StepCallbacks & { setRegeneratingItemId: (id: string | null) => void },
  ): Promise<void>
}
