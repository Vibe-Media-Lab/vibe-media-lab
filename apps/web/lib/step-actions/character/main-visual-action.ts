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

    callbacks.onChange({
      data: result,
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },
}

registerAction(mainVisualAction)
