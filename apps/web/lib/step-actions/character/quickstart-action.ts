import { QuickstartRequestSchema, asCharacterContext } from '@/lib/api/character/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildCharacterBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const quickstartAction: StepAction = {
  actionKey: 'character/quickstart',
  endpoint: '/api/character/quickstart',
  requestSchema: QuickstartRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildCharacterBaseRequest(ctx)
    const charCtx = asCharacterContext(ctx.inputContext)
    const archData = charCtx.archetype

    return {
      ...base,
      archetype: archData?.archetype || '',
      freeText: archData?.freeText,
      params: archData?.params,
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, QuickstartRequestSchema)

    callbacks.setProgress((prev) => ({
      ...prev,
      message: '캐릭터 프로필 생성 중...',
      items: (prev.items ?? []).map((item) => ({ ...item, status: 'processing' as const })),
    }))

    const result = await simpleFetch(this.endpoint, body)

    callbacks.onChange({
      data: result,
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },
}

registerAction(quickstartAction)
