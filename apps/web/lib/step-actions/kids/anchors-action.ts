import {
  AnchorsRequestSchema,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, extractErrorMessage, validateRequestBody } from './_shared'

const anchorsAction: StepAction = {
  actionKey: 'kids/anchors',
  endpoint: '/api/kids-animation/anchors',
  requestSchema: AnchorsRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)
    const scriptResult = unwrapStepResult(kidsCtx.script)

    return {
      ...base,
      anchorPrompts: scriptResult?.anchorPrompts || [],
      ...(ctx.selectedModel && { model: ctx.selectedModel }),
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    const anchorPrompts = body.anchorPrompts as Array<{ id: string; name: string }>

    if (!anchorPrompts || anchorPrompts.length === 0) {
      throw new Error('앵커 프롬프트가 없습니다. 스크립트 단계를 먼저 완료해주세요.')
    }

    validateRequestBody(body, AnchorsRequestSchema)

    // progress 초기화
    callbacks.setProgress((prev) => ({
      ...prev,
      total: anchorPrompts.length,
      message: 'API 호출 중...',
      items: anchorPrompts.map((ap) => ({
        id: ap.id,
        label: ap.name,
        status: 'processing' as const,
      })),
    }))

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, `API 오류: ${response.status}`))
    }

    const result = await response.json()

    callbacks.onChange({
      data: result,
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },

  async regenerateItem(
    itemId: string,
    _editedPrompt: string | undefined,
    ctx: StepActionContext,
    callbacks: StepCallbacks & { setRegeneratingItemId: (id: string | null) => void },
  ) {
    const kidsCtx = asKidsContext(ctx.inputContext)
    const scriptResult = unwrapStepResult(kidsCtx.script)
    const anchorPrompts = scriptResult?.anchorPrompts || []
    const targetPrompt = anchorPrompts.find((ap) => ap.id === itemId)

    if (!targetPrompt) {
      throw new Error(`앵커 프롬프트를 찾을 수 없습니다: ${itemId}`)
    }

    const body = this.buildRequestBody(ctx)

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        anchorPrompts: [targetPrompt],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, `앵커 재생성 실패: ${response.status}`))
    }

    const result = await response.json()
    const anchorsData = result.data || result
    const regeneratedAnchor = anchorsData.anchors?.[0]

    if (!regeneratedAnchor) {
      throw new Error('재생성된 앵커 데이터가 없습니다')
    }

    // ctx.value.data에서 해당 anchor만 immutable 업데이트
    if (ctx.value) {
      const currentData = ctx.value.data as { data?: { anchors?: Array<Record<string, unknown>> }; anchors?: Array<Record<string, unknown>> }
      const currentAnchors = currentData?.data?.anchors || currentData?.anchors || []

      const updatedAnchors = currentAnchors.map((anchor) =>
        (anchor as { id?: string }).id === itemId
          ? { ...anchor, originalUrl: regeneratedAnchor.originalUrl, dbId: regeneratedAnchor.dbId }
          : anchor,
      )

      if (currentData?.data?.anchors) {
        callbacks.onChange({
          ...ctx.value,
          data: { ...currentData, data: { ...currentData.data, anchors: updatedAnchors } },
        })
      } else {
        callbacks.onChange({
          ...ctx.value,
          data: { ...currentData, anchors: updatedAnchors },
        })
      }
    }

    callbacks.setRegeneratingItemId(null)
  },
}

registerAction(anchorsAction)
