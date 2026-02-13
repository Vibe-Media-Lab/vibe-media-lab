import { StoryRequestSchema } from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const storyAction: StepAction = {
  actionKey: 'kids/story',
  endpoint: '/api/kids-animation/story',
  requestSchema: StoryRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    return buildBaseRequest(ctx)
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, StoryRequestSchema)

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

registerAction(storyAction)
