import {
  FinalRequestSchema,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import { registerAction } from '../_action-map'
import type { StepAction, StepActionContext, StepCallbacks } from '../types'
import { buildBaseRequest, validateRequestBody, simpleFetch } from './_shared'

const finalAction: StepAction = {
  actionKey: 'kids/final',
  endpoint: '/api/kids-animation/final',
  requestSchema: FinalRequestSchema,

  buildRequestBody(ctx: StepActionContext) {
    const base = buildBaseRequest(ctx)
    const kidsCtx = asKidsContext(ctx.inputContext)

    const storyData = unwrapStepResult(kidsCtx.story)
    const scriptData = unwrapStepResult(kidsCtx.script)
    const story = storyData?.story
    const _script = scriptData?.script

    const anchors = kidsCtx.anchors?.generated?.map((a) => ({
      id: a.id,
      url: a.url,
      category: a.category || ('character' as const),
      name: a.label || `Anchor-${a.id}`,
    })) || []

    // videos와 audio 응답에서 데이터 추출
    const videosResponse = unwrapStepResult(kidsCtx.videos)
    const audioResponse = unwrapStepResult(kidsCtx.audio)

    const videoShots = videosResponse?.shots || []
    const ttsData = audioResponse?.tts || []
    const bgmIndex = typeof ctx.selectedBgmIndex === 'number' ? ctx.selectedBgmIndex : 0
    const bgmUrl = audioResponse?.bgmTracks?.[bgmIndex]?.url
      || audioResponse?.bgmTracks?.[0]?.url
      || ''

    // shots 데이터 병합 (video + audio)
    const mergedShots = videoShots.map((vShot, index) => {
      const tts = ttsData.find((t) => t.shotNumber === vShot.shotNumber)
      const ttsFallback = tts || ttsData[index]
      return {
        id: vShot.id,
        shotNumber: vShot.shotNumber,
        duration: 10,
        videoUrl: vShot.videoUrl || '',
        audioUrl: ttsFallback?.audioUrl || '',
      }
    })

    return {
      sessionId: base.sessionId,
      shots: mergedShots,
      bgmUrl,
      style: base.style,
      storyTitle: (story as { title?: string })?.title,
      storyLogline: (story as { logline?: string; synopsis?: string })?.logline
        || (story as { synopsis?: string })?.synopsis,
      characters: (story as { characters?: Array<{ name: string; visualDescription: string }> })?.characters?.map((c) => ({
        name: c.name,
        visualDescription: c.visualDescription,
      })),
      anchorUrls: anchors.map((a) => a.url).filter(Boolean),
    }
  },

  async execute(ctx: StepActionContext, callbacks: StepCallbacks) {
    const body = this.buildRequestBody(ctx)
    validateRequestBody(body, FinalRequestSchema)

    callbacks.setProgress((prev) => {
      const prevItems = prev.items ?? []
      const processingItems = prevItems.length > 0
        ? prevItems.map((item) => ({ ...item, status: 'processing' as const }))
        : Array.from({ length: prev.total || 6 }, (_, i) => ({
            id: `item-${i + 1}`,
            label: `#${i + 1}`,
            status: 'processing' as const,
          }))
      return { ...prev, message: 'API 호출 중...', items: processingItems }
    })

    const result = await simpleFetch(this.endpoint, body)

    callbacks.onChange({
      data: result,
      generatedAt: new Date(),
    })
    callbacks.setStatus('reviewing')
  },
}

registerAction(finalAction)
