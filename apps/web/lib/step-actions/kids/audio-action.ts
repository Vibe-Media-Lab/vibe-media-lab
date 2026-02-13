import {
  AudioRequestSchema,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import type { ApiStepResult, AudioResponse } from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const audioAction: StepAction = {
  actionKey: 'kids/audio',
  endpoint: '/api/kids-animation/audio',
  requestSchema: AudioRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)

    const storyData = unwrapStepResult(kidsCtx.story)
    const scriptData = unwrapStepResult(kidsCtx.script)
    const shotsData = unwrapStepResult(kidsCtx.shots)

    const story = storyData?.story
    const script = scriptData?.script
    const shots = shotsData?.shots

    // 기존 audio 응답 추출
    const valueAudio = unwrapStepResult(ctx.value as ApiStepResult<AudioResponse> | null)
    const ctxAudio = unwrapStepResult(kidsCtx.audio)
    const audioResult = valueAudio || ctxAudio

    const existingTts = audioResult?.tts
    const existingBgm = audioResult?.bgmTracks

    // 재생성 모드: 선택된 항목만 재생성
    if (ctx.regenerateMode && ctx.selectedForRegenerate && ctx.selectedForRegenerate.size > 0) {
      const regenerateBgm = ctx.selectedForRegenerate.has('bgm')
      const selectedTtsIds = Array.from(ctx.selectedForRegenerate).filter((id) => id !== 'bgm')

      const modifiedTts = existingTts?.map((t) => {
        if (selectedTtsIds.includes(t.id)) {
          return { ...t, audioUrl: '' }
        }
        return t
      }) || []

      const hasSelectedTts = selectedTtsIds.length > 0

      if (regenerateBgm || hasSelectedTts) {
        return {
          ...base,
          shots: shots || [],
          bgmPrompt: (script as { bgmPrompt?: string })?.bgmPrompt || '',
          bgmDirection: (story as { bgmDirection?: string })?.bgmDirection,
          existingTts: modifiedTts.length > 0 ? modifiedTts : undefined,
          ...(regenerateBgm ? {} : existingBgm ? { existingBgm } : {}),
          ...(ctx.selectedModel && { ttsModel: ctx.selectedModel }),
          ...(ctx.selectedSecondaryModel && { bgmModel: ctx.selectedSecondaryModel }),
        }
      }
    }

    // 일반 모드: 실패한 TTS가 있는지 확인
    const hasFailedTts = existingTts?.some((t) => !t.audioUrl)

    return {
      ...base,
      shots: shots || [],
      bgmPrompt: (script as { bgmPrompt?: string })?.bgmPrompt || '',
      bgmDirection: (story as { bgmDirection?: string })?.bgmDirection,
      ...(hasFailedTts && existingTts ? { existingTts } : {}),
      ...(hasFailedTts && existingBgm ? { existingBgm } : {}),
      ...(ctx.selectedModel && { ttsModel: ctx.selectedModel }),
      ...(ctx.selectedSecondaryModel && { bgmModel: ctx.selectedSecondaryModel }),
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, AudioRequestSchema)

    callbacks.setProgress((prev) => {
      const prevItems = prev.items ?? []
      const processingItems = prevItems.length > 0
        ? prevItems.map((item) => ({ ...item, status: 'processing' as const }))
        : Array.from({ length: prev.total || 6 }, (_, i) => ({
            id: `item-${i + 1}`,
            label: `#${i + 1}`,
            status: 'processing' as const,
          }))
      return { ...prev, message: 'API 호출 중...', items: processingItems }
    })

    const result = await simpleFetch(this.endpoint, body)

    callbacks.onChange({
      data: result,
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },
}

registerAction(audioAction)
