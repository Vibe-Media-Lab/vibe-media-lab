import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { generateImage, getImageServiceProvider } from '@/lib/services'
import {
  AnchorsRequestSchema,
  type AnchorsResponse,
} from '@/lib/api/kids-animation/types'
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

    const { sessionId, projectId, anchorPrompts, formFactor = 'longform', style } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]

    const anchors = []

    for (const anchorPrompt of anchorPrompts) {
      // Determine aspect ratio based on category
      const aspectRatio = anchorPrompt.category === 'character'
        ? formFactorPreset.anchor.character.aspectRatio
        : formFactorPreset.anchor.background.aspectRatio

      const resolution = formFactorPreset.resolution

      // Build full prompt with style suffix
      const fullPrompt = `${anchorPrompt.prompt}. ${styleConfig.visualPromptSuffix}`

      logger.debug('Generating anchor image', {
        category: anchorPrompt.category,
        name: anchorPrompt.name,
        aspectRatio,
        resolution,
      })

      // Generate image (userId 전달하면 자동으로 Library에 저장됨)
      const result = await generateImage({
        prompt: fullPrompt,
        aspectRatio,
        resolution,
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

      anchors.push({
        id: anchorPrompt.id,
        category: anchorPrompt.category,
        name: anchorPrompt.name,
        description: anchorPrompt.prompt,
        originalUrl: result.success ? result.url : undefined,
        dbId: result.dbId, // Library에 저장된 레코드 ID
        expandedUrls: [], // Will be filled by expand step
      })
    }

    return {
      sessionId,
      anchors,
      provider: getImageServiceProvider(),
    }
  }
)

// 앵커 이미지 생성은 시간이 오래 걸림
export const maxDuration = 300
