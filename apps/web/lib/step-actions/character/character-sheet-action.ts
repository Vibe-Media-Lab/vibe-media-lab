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

    // main-visual에서 선택된 이미지 URL + description 스냅샷 추출
    const mainVisualData = unwrapStepResult(charCtx['main-visual'])
    const mainVisualResult = unwrapApiData<{
      images?: Array<{ id: string; url: string }>
      selectedImageId?: string
      selectedImageUrl?: string
      selectedVisualDescription?: string
    }>(mainVisualData)

    let selectedImageUrl = mainVisualResult?.selectedImageUrl || ''
    if (!selectedImageUrl && mainVisualResult?.selectedImageId && mainVisualResult?.images) {
      const found = mainVisualResult.images.find((img) => img.id === mainVisualResult.selectedImageId)
      selectedImageUrl = found?.url || ''
    }

    // quickstart에서 프로필 + styleHint 추출
    const quickstartData = unwrapStepResult(charCtx.quickstart)
    const quickstartResult = unwrapApiData<{
      profile?: { name: string; visualDescription: string }
      styleHint?: { visualStyle: string; promptKeywords: string[] }
    }>(quickstartData)

    // selectedVisualDescription 스냅샷 우선, fallback: quickstart 단수
    const visualDescription =
      mainVisualResult?.selectedVisualDescription ||
      quickstartResult?.profile?.visualDescription || ''

    return {
      ...base,
      selectedImageUrl,
      characterProfile: {
        name: quickstartResult?.profile?.name || '',
        visualDescription,
      },
      ...(quickstartResult?.styleHint && { styleHint: quickstartResult.styleHint }),
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
      { id: 'front_view', label: '정면', status: 'processing' as const },
      { id: 'three_quarter', label: '3/4 뷰', status: 'processing' as const },
      { id: 'happy_expression', label: '행복 표정', status: 'processing' as const },
      { id: 'action_pose', label: '액션 포즈', status: 'processing' as const },
    ]

    callbacks.setProgress((prev) => ({
      ...prev,
      total: variationItems.length,
      message: '캐릭터 시트 생성 중...',
      items: variationItems,
    }))

    const result = await simpleFetch(this.endpoint, body)

    // 항목별 완료/실패 상태 반영
    const apiData = (result as Record<string, unknown>).data || result
    const sheets = (apiData as Record<string, unknown>).sheets as Array<{ id: string; url: string; status?: string }> | undefined
    if (sheets) {
      callbacks.setProgress((prev) => ({
        ...prev,
        current: sheets.filter((s) => s.status === 'completed').length,
        items: prev.items?.map((p) => {
          const sheet = sheets.find((s) => s.id === p.id)
          return sheet ? { ...p, status: sheet.url ? 'completed' as const : 'failed' as const } : p
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
    const body = { ...this.buildRequestBody(ctx), regenerateVariationId: itemId }

    const result = await simpleFetch(this.endpoint, body)
    const apiData = (result as Record<string, unknown>).data || result
    const newSheet = ((apiData as Record<string, unknown>).sheets as Array<Record<string, unknown>> | undefined)?.[0]
    if (!newSheet) throw new Error('재생성된 시트가 없습니다')

    // ctx.value.data에서 sheets 배열 찾기 (두 가지 형태 처리)
    if (ctx.value) {
      const currentData = ctx.value.data as Record<string, unknown>
      const innerData = (currentData?.data as Record<string, unknown>) || currentData
      const currentSheets = (innerData?.sheets as Array<Record<string, unknown>>) || []

      const updatedSheets = currentSheets.map((sheet) =>
        (sheet as { id?: string }).id === itemId ? { ...sheet, ...newSheet } : sheet
      )

      if (currentData?.data && (currentData.data as Record<string, unknown>)?.sheets) {
        callbacks.onChange({
          ...ctx.value,
          data: { ...currentData, data: { ...(currentData.data as object), sheets: updatedSheets } },
        })
      } else {
        callbacks.onChange({
          ...ctx.value,
          data: { ...currentData, sheets: updatedSheets },
        })
      }
    }

    callbacks.setRegeneratingItemId(null)
  },
}

registerAction(characterSheetAction)
