import {
  ExpandRequestSchema,
  asKidsContext,
} from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, extractErrorMessage, validateRequestBody } from './_shared'

const expandAction: StepAction = {
  actionKey: 'kids/expand',
  endpoint: '/api/kids-animation/expand',
  requestSchema: ExpandRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)

    const anchors = kidsCtx.anchors?.generated?.map((a) => ({
      id: a.id,
      url: a.url,
      category: a.category || ('character' as const),
      name: a.label || `Anchor-${a.id}`,
    })) || []

    return {
      ...base,
      anchors: anchors.map((a) => ({
        id: a.id || `anchor-${anchors.indexOf(a) + 1}`,
        category: a.category || 'character',
        name: a.name || 'Anchor',
        url: a.url,
      })),
      ...(ctx.selectedModel && { model: ctx.selectedModel }),
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    const anchors = body.anchors as Array<{ id: string; category: string; name: string; url: string }>

    if (!anchors || anchors.length === 0) {
      throw new Error('확장할 앵커 데이터가 없습니다')
    }

    const characterAnchors = anchors.filter((a) => a.category === 'character')
    const backgroundAnchors = anchors.filter((a) => a.category === 'background')

    callbacks.setProgress((prev) => ({
      ...prev,
      total: 2,
      message: `앵커 확장 시작... (캐릭터 ${characterAnchors.length}개, 배경 ${backgroundAnchors.length}개)`,
      items: [
        { id: 'characters', label: '캐릭터 확장', status: 'processing' as const },
        { id: 'backgrounds', label: '배경 확장', status: 'pending' as const },
      ],
    }))

    const allExpanded: Array<{
      id: string
      originalId: string
      category: string
      name: string
      variation: string
      url: string
    }> = []

    // 1단계: 캐릭터 확장
    if (characterAnchors.length > 0) {
      const charRequestBody = { ...body, anchors: characterAnchors }
      validateRequestBody(charRequestBody, ExpandRequestSchema)

      callbacks.setProgress((prev) => ({
        ...prev,
        current: 0,
        message: `캐릭터 확장 중... (${characterAnchors.length}개)`,
      }))

      const charResponse = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, anchors: characterAnchors }),
      })

      if (!charResponse.ok) {
        const errorData = await charResponse.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, `캐릭터 확장 실패: ${charResponse.status}`))
      }

      const charResult = await charResponse.json()
      const charExpanded = charResult.data?.expanded || charResult.expanded || []
      allExpanded.push(...charExpanded)

      callbacks.setProgress((prev) => ({
        ...prev,
        current: 1,
        message: '캐릭터 확장 완료! 배경 확장 준비 중...',
      }))
    }

    // 2단계: 배경 확장
    if (backgroundAnchors.length > 0) {
      const bgRequestBody = { ...body, anchors: backgroundAnchors }
      validateRequestBody(bgRequestBody, ExpandRequestSchema)

      callbacks.setProgress((prev) => ({
        ...prev,
        message: `배경 확장 중... (${backgroundAnchors.length}개)`,
      }))

      const bgResponse = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, anchors: backgroundAnchors }),
      })

      if (!bgResponse.ok) {
        const errorData = await bgResponse.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, `배경 확장 실패: ${bgResponse.status}`))
      }

      const bgResult = await bgResponse.json()
      const bgExpanded = bgResult.data?.expanded || bgResult.expanded || []
      allExpanded.push(...bgExpanded)
    }

    // 전체 결과 병합
    const successCount = allExpanded.filter((e) => !e.url.includes('error=true')).length
    const failedCount = allExpanded.filter((e) => e.url.includes('error=true')).length

    callbacks.onChange({
      data: {
        success: true,
        data: {
          sessionId: body.sessionId,
          expanded: allExpanded,
          stats: {
            total: allExpanded.length,
            success: successCount,
            failed: failedCount,
          },
        },
      },
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },
}

registerAction(expandAction)
