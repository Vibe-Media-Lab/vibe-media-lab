import { z } from 'zod'
import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { editImage } from '@/lib/services'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/kids-animation/shots/regenerate')

const ShotRegenerateSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  shotId: z.string(),
  visualPrompt: z.string(),
  anchorUrls: z.array(z.string()),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
})

interface ShotRegenerateResponse {
  shotId: string
  imageUrl: string
}

/**
 * POST /api/kids-animation/shots/regenerate
 *
 * 개별 샷 이미지 재생성
 */
export const POST = createApiHandler<ShotRegenerateResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = ShotRegenerateSchema.parse(body)

    const { sessionId, projectId, shotId, visualPrompt, anchorUrls, style, formFactor } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]

    logger.info('Shot image regeneration started', { sessionId, shotId })

    const prompt = `${visualPrompt}. ${styleConfig.visualPromptSuffix}`

    const result = await editImage({
      prompt,
      referenceUrls: anchorUrls,
      aspectRatio: formFactorPreset.shot.aspectRatio,
      resolution: formFactorPreset.shot.resolution,
      userId: user.id,
      projectId,
      sessionId,
      metadata: { style, formFactor, regenerate: true },
    })

    if (!result.success || !result.url) {
      throw new Error(result.error || '샷 이미지 재생성에 실패했습니다')
    }

    logger.info('Shot image regeneration completed', { sessionId, shotId, url: result.url.slice(0, 50) })

    return { shotId, imageUrl: result.url }
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)

export const maxDuration = 120
