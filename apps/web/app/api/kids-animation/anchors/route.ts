import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { generateImage, getImageServiceProvider } from '@/lib/services'
import {
  AnchorsRequestSchema,
  type AnchorsResponse,
} from '@/lib/api/kids-animation/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'

const logger = getLogger('kids-animation/anchors')

/**
 * POST /api/kids-animation/anchors
 *
 * 앵커 이미지 생성 (캐릭터 + 배경)
 *
 * 서비스 연동:
 * - Primary: Direct Gemini API (gemini-3-pro-image-preview)
 * - Fallback: Kie.ai (nano-banana)
 *
 * 이미지 설정:
 * - 캐릭터: 1:1 (정사각형), 2K
 * - 배경: formFactor에 따라 16:9 또는 9:16, 2K
 */
export const POST = createApiHandler<AnchorsResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = AnchorsRequestSchema.parse(body)

    const provider = getImageServiceProvider()
    logger.debug('Starting anchor generation', {
      provider,
      promptCount: validated.anchorPrompts?.length,
    })

    const { sessionId, projectId, anchorPrompts, formFactor = 'longform', style, model } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const routeOverrides = buildRouteOverrides('kids-animation', 'anchors', 'text-to-image')

    // 병렬 실행으로 타임아웃 방지
    const startTime = Date.now()
    const settled = await Promise.allSettled(
      anchorPrompts.map(async (anchorPrompt) => {
        const aspectRatio = anchorPrompt.category === 'character'
          ? formFactorPreset.anchor.character.aspectRatio
          : formFactorPreset.anchor.background.aspectRatio

        const resolution = formFactorPreset.resolution
        const fullPrompt = `${anchorPrompt.prompt}. ${styleConfig.visualPromptSuffix}`

        logger.debug('Generating anchor image', {
          category: anchorPrompt.category,
          name: anchorPrompt.name,
          aspectRatio,
          resolution,
        })

        const result = await generateImage({
          prompt: fullPrompt,
          aspectRatio,
          resolution,
          model,
          routeOverrides,
          userId: user.id,
          projectId,
          sessionId,
          metadata: {
            anchorId: anchorPrompt.id,
            category: anchorPrompt.category,
            name: anchorPrompt.name,
            style,
          },
        })

        logger.debug('Anchor generation result', {
          id: anchorPrompt.id,
          success: result.success,
          hasUrl: !!result.url,
        })

        return {
          id: anchorPrompt.id,
          category: anchorPrompt.category,
          name: anchorPrompt.name,
          description: anchorPrompt.prompt,
          originalUrl: result.success ? result.url : undefined,
          dbId: result.dbId,
          expandedUrls: [],
        }
      })
    )

    const anchors = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value
      const prompt = anchorPrompts[i]!
      logger.error('Anchor generation threw', {
        id: prompt.id,
        error: String(s.reason),
      })
      return {
        id: prompt.id,
        category: prompt.category,
        name: prompt.name,
        description: prompt.prompt,
        originalUrl: undefined,
        dbId: undefined,
        expandedUrls: [],
      }
    })

    logger.info('All anchors generated', {
      total: anchors.length,
      success: anchors.filter(a => a.originalUrl).length,
      elapsedMs: Date.now() - startTime,
    })

    return {
      sessionId,
      anchors,
      provider: getImageServiceProvider(),
    }
  }
)

// 앵커 이미지 생성은 시간이 오래 걸림
export const maxDuration = 300
