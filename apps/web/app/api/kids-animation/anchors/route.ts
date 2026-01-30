import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { generateImage, getImageServiceProvider } from '@/lib/services'
import {
  AnchorsRequestSchema,
  type AnchorsResponse,
} from '@/lib/api/kids-animation/types'

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
  async (request) => {
    const body = await request.json()
    const validated = AnchorsRequestSchema.parse(body)

    // Debug: log provider info
    const provider = getImageServiceProvider()
    console.log('[anchors] Image provider:', provider)
    console.log('[anchors] Anchor prompts count:', validated.anchorPrompts?.length)

    const { sessionId, anchorPrompts, formFactor = 'longform', style } = validated
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

      console.log(`[anchors] Generating ${anchorPrompt.category}: ${anchorPrompt.name}`)
      console.log(`[anchors] Prompt: ${fullPrompt.slice(0, 100)}...`)
      console.log(`[anchors] Aspect ratio: ${aspectRatio}, Resolution: ${resolution}`)

      // Generate image
      const result = await generateImage({
        prompt: fullPrompt,
        aspectRatio,
        resolution,
      })

      console.log(`[anchors] Result:`, result.success ? result.url : result.error)

      anchors.push({
        id: anchorPrompt.id,
        category: anchorPrompt.category,
        name: anchorPrompt.name,
        description: anchorPrompt.prompt,
        originalUrl: result.success ? result.url : undefined,
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
