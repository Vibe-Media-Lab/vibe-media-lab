import {
  CharacterSheetRequestSchema,
  asCharacterContext,
  unwrapStepResult,
} from '@/lib/api/character/types'
import { unwrapApiData } from '@/lib/workflow/helpers'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildCharacterBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const characterSheetAction: StepAction = {
  actionKey: 'character/character-sheet',
  endpoint: '/api/character/character-sheet',
  requestSchema: CharacterSheetRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildCharacterBaseRequest(ctx)
    const charCtx = asCharacterContext(ctx.inputContext)

    // main-visual에서 선택된 이미지 URL 추출
    const mainVisualData = unwrapStepResult(charCtx['main-visual'])
    const mainVisualResult = unwrapApiData<{
      images?: Array<{ id: string; url: string }>
      selectedImageId?: string
      selectedImageUrl?: string
    }>(mainVisualData)

    let selectedImageUrl = mainVisualResult?.selectedImageUrl || ''
    if (!selectedImageUrl && mainVisualResult?.selectedImageId && mainVisualResult?.images) {
      const found = mainVisualResult.images.find((img) => img.id === mainVisualResult.selectedImageId)
      selectedImageUrl = found?.url || ''
    }

    // quickstart에서 프로필 추출
    const quickstartData = unwrapStepResult(charCtx.quickstart)
    const quickstartResult = unwrapApiData<{ profile?: { name: string; visualDescription: string } }>(quickstartData)

    return {
      ...base,
      selectedImageUrl,
      characterProfile: {
        name: quickstartResult?.profile?.name || '',
        visualDescription: quickstartResult?.profile?.visualDescription || '',
      },
      ...(ctx.selectedModel && { model: ctx.selectedModel }),
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, CharacterSheetRequestSchema)

    if (!body.selectedImageUrl) {
      throw new Error('선택된 메인 초상화가 없습니다. 이전 단계에서 이미지를 선택해주세요.')
    }

    const variationItems = [
      { id: 'front', label: '정면', status: 'processing' as const },
      { id: 'three_quarter', label: '3/4 뷰', status: 'processing' as const },
      { id: 'happy', label: '행복 표정', status: 'processing' as const },
      { id: 'action', label: '액션 포즈', status: 'processing' as const },
    ]

    callbacks.setProgress((prev) => ({
      ...prev,
      total: variationItems.length,
      message: '캐릭터 시트 생성 중...',
      items: variationItems,
    }))

    const result = await simpleFetch(this.endpoint, body)

    callbacks.onChange({
      data: result,
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },
}

registerAction(characterSheetAction)
