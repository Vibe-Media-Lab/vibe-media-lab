import {
  ScriptRequestSchema,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const scriptAction: StepAction = {
  actionKey: 'kids/script',
  endpoint: '/api/kids-animation/script',
  requestSchema: ScriptRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)
    const storyData = unwrapStepResult(kidsCtx.story)

    return {
      ...base,
      story: storyData?.story,
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, ScriptRequestSchema)

    callbacks.setProgress((prev) => ({
      ...prev,
      message: 'API 호출 중...',
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

registerAction(scriptAction)
