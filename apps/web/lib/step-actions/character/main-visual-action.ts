import {
  MainVisualRequestSchema,
  asCharacterContext,
  unwrapStepResult,
} from '@/lib/api/character/types'
import { unwrapApiData } from '@/lib/workflow/helpers'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildCharacterBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const mainVisualAction: StepAction = {
  actionKey: 'character/main-visual',
  endpoint: '/api/character/main-visual',
  requestSchema: MainVisualRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildCharacterBaseRequest(ctx)
    const charCtx = asCharacterContext(ctx.inputContext)
    const quickstartData = unwrapStepResult(charCtx.quickstart)
    const profile = unwrapApiData<{ profile?: { name: string; personality: string; visualDescription: string; backstory: string } }>(quickstartData)

    return {
      ...base,
      characterProfile: profile?.profile || {
        name: '',
        personality: '',
        visualDescription: '',
        backstory: '',
      },
      ...(ctx.selectedModel && { model: ctx.selectedModel }),
      count: ctx.config.batchSize || 4,
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, MainVisualRequestSchema)
    const count = (body.count as number) || 4

    callbacks.setProgress((prev) => ({
      ...prev,
      total: count,
      message: '캐릭터 초상화 생성 중...',
      items: Array.from({ length: count }, (_, i) => ({
        id: `portrait-${i + 1}`,
        label: `초상화 #${i + 1}`,
        status: 'processing' as const,
      })),
    }))

    const result = await simpleFetch(this.endpoint, body)

    // 항목별 완료/실패 상태 반영
    const apiData = (result as Record<string, unknown>).data || result
    const images = (apiData as Record<string, unknown>).images as Array<{ id: string; url: string; status?: string }> | undefined
    if (images) {
      callbacks.setProgress((prev) => ({
        ...prev,
        current: images.filter((img) => img.status === 'completed').length,
        items: prev.items?.map((p) => {
          const img = images.find((i) => i.id === p.id)
          return img ? { ...p, status: img.url ? 'completed' as const : 'failed' as const } : p
        }),
      }))
    }

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
    // portrait-1 → 0
    const index = parseInt(itemId.replace('portrait-', ''), 10) - 1
    if (isNaN(index) || index < 0) {
      throw new Error(`유효하지 않은 항목 ID: ${itemId}`)
    }

    const body = { ...this.buildRequestBody(ctx), regenerateIndex: index }

    const result = await simpleFetch(this.endpoint, body)
    const apiData = (result as Record<string, unknown>).data || result
    const newImage = ((apiData as Record<string, unknown>).images as Array<Record<string, unknown>> | undefined)?.[0]
    if (!newImage) throw new Error('재생성된 이미지가 없습니다')

    // ctx.value.data에서 images 배열 찾기 (두 가지 형태 처리)
    if (ctx.value) {
      const currentData = ctx.value.data as Record<string, unknown>
      const innerData = (currentData?.data as Record<string, unknown>) || currentData
      const currentImages = (innerData?.images as Array<Record<string, unknown>>) || []

      const updatedImages = currentImages.map((img) =>
        (img as { id?: string }).id === itemId ? { ...img, ...newImage } : img
      )

      // 원래 형태 유지하면서 immutable 업데이트
      if (currentData?.data && (currentData.data as Record<string, unknown>)?.images) {
        callbacks.onChange({
          ...ctx.value,
          data: { ...currentData, data: { ...(currentData.data as object), images: updatedImages } },
        })
      } else {
        callbacks.onChange({
          ...ctx.value,
          data: { ...currentData, images: updatedImages },
        })
      }
    }

    callbacks.setRegeneratingItemId(null)
  },
}

registerAction(mainVisualAction)
