import {
  ShotsRequestSchema,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import { selectReferenceImages } from '@/lib/utils/shot-anchor-mapper'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, extractErrorMessage, validateRequestBody, simpleFetch } from './_shared'

const shotsAction: StepAction = {
  actionKey: 'kids/shots',
  endpoint: '/api/kids-animation/shots',
  requestSchema: ShotsRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)

    const scriptData = unwrapStepResult(kidsCtx.script)
    const expandedData = unwrapStepResult(kidsCtx.expand)

    const anchors = kidsCtx.anchors?.generated?.map((a) => ({
      id: a.id,
      url: a.url,
      category: a.category || ('character' as const),
      name: a.label || `Anchor-${a.id}`,
    })) || []

    const script = scriptData?.script

    // LLM 응답에서 shotNumber가 누락될 수 있으므로 인덱스 기반으로 보장
    const scriptForShots = script as { shots?: Array<Record<string, unknown>> } | undefined
    const sanitizedScript = scriptForShots?.shots
      ? {
          ...scriptForShots,
          shots: scriptForShots.shots.map((shot, idx) => ({
            ...shot,
            shotNumber: shot.shotNumber ?? idx + 1,
            id: shot.id || `shot-${idx + 1}`,
            duration: shot.duration ?? 10,
          })),
        }
      : script

    return {
      ...base,
      script: sanitizedScript,
      anchors,
      expanded: expandedData?.expanded || [],
      ...(ctx.selectedModel && { model: ctx.selectedModel }),
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, ShotsRequestSchema)

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

  async regenerateItem(
    itemId: string,
    editedPrompt: string | undefined,
    ctx: StepActionContext,
    callbacks: StepCallbacks & { setRegeneratingItemId: (id: string | null) => void },
  ) {
    const kidsCtx = asKidsContext(ctx.inputContext)
    const setupData = kidsCtx.setup ?? { style: 'pixar', formFactor: 'longform' }
    const storyData = unwrapStepResult(kidsCtx.story)
    const scriptResult = unwrapStepResult(kidsCtx.script)
    const scriptShots = scriptResult?.script?.shots || []
    const expandData = unwrapStepResult(kidsCtx.expand)
    const expandedAnchors = expandData?.expanded || []

    const currentData = ctx.value?.data as {
      success?: boolean
      data?: { shots?: Array<{ id: string; shotNumber: number; visualPrompt: string; imageUrl?: string }> }
      shots?: Array<{ id: string; shotNumber: number; visualPrompt: string; imageUrl?: string }>
    } | undefined
    const innerShots = currentData?.data?.shots || currentData?.shots
    const targetShot = innerShots?.find((s) => s.id === itemId)
    const targetScriptShot = scriptShots.find(
      (shot) => shot.id === itemId || (targetShot?.shotNumber !== undefined && shot.shotNumber === targetShot.shotNumber),
    )

    const promptToUse = editedPrompt || targetScriptShot?.visualPrompt || targetShot?.visualPrompt
    if (!promptToUse) {
      throw new Error(`샷 데이터를 찾을 수 없습니다: ${itemId}`)
    }

    // 앵커 정보
    const anchorInfos = (kidsCtx.anchors?.generated || [])
      .filter((a) => a.url)
      .map((a) => ({
        id: a.id,
        category: (a.category || 'character') as 'character' | 'background',
        name: a.label || `Anchor-${a.id}`,
        url: a.url,
      }))

    if (anchorInfos.length === 0) {
      throw new Error('참조 이미지(앵커)가 없습니다. 앵커 단계를 다시 생성해주세요.')
    }

    // 샷별 참조 이미지 매핑
    const anchorUrls = selectReferenceImages(
      {
        characters: targetScriptShot?.characters,
        location: targetScriptShot?.location,
        emotion: targetScriptShot?.emotion,
        speaker: targetScriptShot?.speaker,
      },
      anchorInfos,
      expandedAnchors,
    )

    const regenRequestBody = {
      sessionId: ctx.sessionId || storyData?.sessionId || `session-${Date.now()}`,
      projectId: ctx.projectId,
      shotId: itemId,
      visualPrompt: promptToUse,
      anchorUrls,
      style: setupData.style || 'pixar',
      formFactor: setupData.formFactor || 'longform',
      ...(ctx.selectedModel && { model: ctx.selectedModel }),
    }

    const response = await fetch('/api/kids-animation/shots/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regenRequestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, `샷 이미지 재생성 실패: ${response.status}`))
    }

    const result = await response.json()
    const newImageUrl = result.data?.imageUrl || ''

    if (!newImageUrl) {
      throw new Error('이미지 URL이 반환되지 않았습니다')
    }

    // value.data에서 해당 shot의 imageUrl만 immutable update
    if (ctx.value) {
      if (currentData?.success !== undefined && currentData?.data?.shots) {
        callbacks.onChange({
          ...ctx.value,
          data: {
            ...currentData,
            data: {
              ...currentData.data,
              shots: currentData.data.shots.map((shot) =>
                shot.id === itemId
                  ? { ...shot, imageUrl: newImageUrl, visualPrompt: promptToUse }
                  : shot,
              ),
            },
          },
        })
      } else if (currentData?.shots) {
        callbacks.onChange({
          ...ctx.value,
          data: {
            ...currentData,
            shots: currentData.shots.map((shot) =>
              shot.id === itemId
                ? { ...shot, imageUrl: newImageUrl, visualPrompt: promptToUse }
                : shot,
            ),
          },
        })
      }
    }
  },
}

registerAction(shotsAction)
