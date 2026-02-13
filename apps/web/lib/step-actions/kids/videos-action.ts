import {
  VideoRequestSchema,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import type { ApiStepResult, ShotsResponse } from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, extractErrorMessage, validateRequestBody } from './_shared'

const videosAction: StepAction = {
  actionKey: 'kids/videos',
  endpoint: '/api/kids-animation/videos',
  requestSchema: null, // 개별 shot 단위 요청이라 별도 처리

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)
    const shotsData = unwrapStepResult(kidsCtx.shots)
    const currentValueShots = unwrapStepResult(ctx.value as unknown as ApiStepResult<ShotsResponse> | null)?.shots

    return {
      ...base,
      shots: shotsData?.shots || currentValueShots || [],
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    const shots = body.shots as Array<{
      id: string
      shotNumber: number
      duration: number
      imageUrl: string
      visualPrompt: string
    }> | undefined

    if (!shots || shots.length === 0) {
      throw new Error('비디오 생성할 샷 데이터가 없습니다')
    }

    // 진행 항목 초기화
    const videoItems = shots.map((shot, i) => ({
      id: shot.id,
      label: `Shot ${i + 1}`,
      status: (i === 0 ? 'processing' : 'pending') as 'processing' | 'pending',
    }))

    callbacks.setProgress((prev) => ({
      ...prev,
      total: videoItems.length,
      message: '비디오 생성 시작...',
      items: videoItems,
    }))

    // 순차 비디오 생성
    const results: Array<{ id: string; shotNumber: number; videoUrl: string }> = []

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]
      if (!shot) continue

      callbacks.setProgress((prev) => {
        const updatedItems = (prev.items ?? []).map((item, idx) => ({
          ...item,
          status:
            idx < i
              ? ('completed' as const)
              : idx === i
                ? ('processing' as const)
                : ('pending' as const),
        }))
        return {
          ...prev,
          current: i,
          message: `비디오 ${i + 1}/${shots.length} 생성 중...`,
          items: updatedItems,
        }
      })

      const videoRequestBody = {
        sessionId: body.sessionId,
        shot,
        formFactor: body.formFactor,
        ...(ctx.selectedModel && { model: ctx.selectedModel }),
      }
      validateRequestBody(videoRequestBody, VideoRequestSchema)

      let videoUrl = ''
      let shotError = ''
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(videoRequestBody),
        })

        if (response.ok) {
          const result = await response.json()
          videoUrl = result.data?.videoUrl || ''
        } else {
          const errorData = await response.json().catch(() => ({}))
          shotError = extractErrorMessage(errorData, `HTTP ${response.status}`)
        }
      } catch (fetchError) {
        shotError = fetchError instanceof Error ? fetchError.message : '네트워크 에러'
      }

      results.push({ id: shot.id, shotNumber: shot.shotNumber, videoUrl })

      if (videoUrl) {
        callbacks.setCompletedUrls((prev) => ({ ...prev, [shot.id]: videoUrl }))
      }

      callbacks.setProgress((prev) => {
        const updatedItems = (prev.items ?? []).map((item, idx) => ({
          ...item,
          status:
            idx <= i
              ? (idx === i && !videoUrl ? ('failed' as const) : ('completed' as const))
              : idx === i + 1
                ? ('processing' as const)
                : ('pending' as const),
        }))
        const failMessage = shotError
          ? `비디오 ${i + 1}/${shots.length} 실패: ${shotError}`
          : `비디오 ${i + 1}/${shots.length} 실패 - 계속 진행`
        return {
          ...prev,
          current: i + 1,
          message: videoUrl
            ? `비디오 ${i + 1}/${shots.length} 완료`
            : failMessage,
          items: updatedItems,
        }
      })
    }

    // 전체 완료
    const failedCount = results.filter((r) => !r.videoUrl).length

    callbacks.onChange({
      data: {
        success: true,
        data: { sessionId: body.sessionId, shots: results },
      },
      generatedAt: new Date(),
    })

    if (failedCount > 0) {
      callbacks.setError(`${shots.length}개 중 ${failedCount}개 비디오 생성 실패 - 재생성으로 다시 시도하세요`)
    }
    callbacks.setStatus('reviewing')
  },

  async regenerateItem(
    itemId: string,
    _editedPrompt: string | undefined,
    ctx: StepActionContext,
    callbacks: StepCallbacks & { setRegeneratingItemId: (id: string | null) => void },
  ) {
    const kidsCtx = asKidsContext(ctx.inputContext)
    const setupData = kidsCtx.setup ?? { style: 'pixar', formFactor: 'longform' }
    const storyData = unwrapStepResult(kidsCtx.story)
    const shotsData = unwrapStepResult(kidsCtx.shots)

    const currentValueData = ctx.value?.data as {
      success?: boolean
      data?: { sessionId?: string; shots?: Array<{ id: string; shotNumber: number; videoUrl: string; visualPrompt?: string; imageUrl?: string; duration?: number }> }
      shots?: Array<{ id: string; shotNumber: number; videoUrl: string; visualPrompt?: string; imageUrl?: string; duration?: number }>
    } | undefined
    const currentShot = (currentValueData?.data?.shots || currentValueData?.shots)?.find((s) => s.id === itemId)
    const fallbackShot = shotsData?.shots?.find((s) => s.id === itemId)
    const originalShot = currentShot
      ? { ...fallbackShot, ...currentShot }
      : fallbackShot

    if (!originalShot) {
      throw new Error(`원본 샷 데이터를 찾을 수 없습니다: ${itemId}`)
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: ctx.sessionId || storyData?.sessionId || `session-${Date.now()}`,
        shot: originalShot,
        formFactor: setupData.formFactor || 'longform',
        ...(ctx.selectedModel && { model: ctx.selectedModel }),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, `비디오 재생성 실패: ${response.status}`))
    }

    const result = await response.json()
    const newVideoUrl = result.data?.videoUrl || ''

    if (!newVideoUrl) {
      throw new Error('비디오 URL이 반환되지 않았습니다')
    }

    // value.data에서 해당 shot의 videoUrl만 immutable update
    if (ctx.value) {
      const data = ctx.value.data as {
        success?: boolean
        data?: { sessionId?: string; shots?: Array<{ id: string; shotNumber: number; videoUrl: string }> }
        shots?: Array<{ id: string; shotNumber: number; videoUrl: string }>
      }
      const innerData = data?.data || (data as unknown as { sessionId?: string; shots?: Array<{ id: string; shotNumber: number; videoUrl: string }> })

      const currentShots = innerData?.shots
      if (!currentShots || currentShots.length === 0) {
        throw new Error('비디오 데이터가 존재하지 않습니다')
      }

      const updatedShots = currentShots.map((shot) =>
        shot.id === itemId ? { ...shot, videoUrl: newVideoUrl } : shot,
      )

      if (data?.success !== undefined && data?.data) {
        callbacks.onChange({
          ...ctx.value,
          data: { ...data, data: { ...data.data, shots: updatedShots } },
        })
      } else {
        callbacks.onChange({
          ...ctx.value,
          data: { ...data, shots: updatedShots },
        })
      }
    }
  },
}

registerAction(videosAction)
