import { createApiHandler } from '@/lib/api'
import { z } from 'zod'
import { editImage, getImageServiceProvider } from '@/lib/services'
import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { getLogger } from '@/lib/logger'

const logger = getLogger('kids-animation/expand')

/**
 * 앵커 확장 변형 타입
 */
interface ExpandedAnchor {
  id: string
  originalId: string
  category: 'character' | 'background'
  name: string
  variation: string
  url: string
}

interface ExpandResponse {
  sessionId: string
  expanded: ExpandedAnchor[]
  provider: 'gemini' | 'kieai' | 'mock'
  stats: {
    total: number
    success: number
    failed: number
  }
}

/**
 * 캐릭터 변형 프롬프트 (Gemini 3 Pro Image 최적화)
 *
 * 참조 이미지 기반 일관성 유지 프롬프트
 * NOTE: front는 앵커 생성 단계에서 이미 생성되므로 확장에서 제외
 */
const CHARACTER_VARIATIONS = {
  three_quarter: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. CAMERA ANGLE: 45-degree rotation to the right, showing side profile of face and body, one ear partially visible, nose clearly in profile view, body turned to match face angle. Full body visible. Neutral expression. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
  happy: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. CAMERA ANGLE: Frontal 0-degree view. EXPRESSION: Happy and joyful, natural warm smile. Full body visible. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
  sad: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. CAMERA ANGLE: Frontal 0-degree view. EXPRESSION: Sad and downcast, melancholic mood. Full body visible. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
} as const

/**
 * 배경 변형 프롬프트 (Gemini 3 Pro Image 최적화)
 * NOTE: wide는 앵커 생성 단계에서 이미 생성되므로 확장에서 제외
 */
const BACKGROUND_VARIATIONS = {
  medium: 'Generate the exact same location from the reference image. Disney Pixar 3D animation style. COMPOSITION: Medium close-up shot, 50-degree field of view, zoomed in to show central area detail, large empty space in foreground (bottom 30% of frame) for character placement, background elements slightly out of focus. No characters present. Cinematic lighting. Maintain identical architectural details, colors, and mood.',
} as const

type CharacterVariation = keyof typeof CHARACTER_VARIATIONS
type BackgroundVariation = keyof typeof BACKGROUND_VARIATIONS

const ExpandRequestSchema = z.object({
  sessionId: z.string(),
  anchors: z.array(z.object({
    id: z.string(),
    category: z.enum(['character', 'background']),
    name: z.string(),
    url: z.string(),
  })),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  // front/wide는 앵커 생성 단계에서 이미 생성되므로 기본값에서 제외
  characterVariations: z.array(z.enum(['three_quarter', 'happy', 'sad'])).optional(),
  backgroundVariations: z.array(z.enum(['medium'])).optional(),
})

/**
 * POST /api/kids-animation/expand
 *
 * 앵커 이미지를 다양한 각도/표정으로 확장
 *
 * - 캐릭터: three_quarter, happy, sad (3종) - front는 앵커 원본 사용
 * - 배경: medium (1종) - wide는 앵커 원본 사용
 *
 * 서비스 연동:
 * - Primary: Direct Gemini API (gemini-3-pro-image-preview)
 * - Fallback: Kie.ai (nano-banana-pro)
 */
export const POST = createApiHandler<ExpandResponse>(
  async (request) => {
    const body = await request.json()
    const validated = ExpandRequestSchema.parse(body)

    const {
      sessionId,
      anchors,
      formFactor = 'longform',
      // front/wide는 앵커 원본을 사용하므로 제외
      characterVariations = ['three_quarter', 'happy', 'sad'],
      backgroundVariations = ['medium'],
    } = validated

    // Get aspect ratios from form factor preset
    const preset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const characterAspectRatio = preset.anchor.character.aspectRatio
    const backgroundAspectRatio = preset.anchor.background.aspectRatio
    const resolution = preset.resolution

    const expanded: ExpandedAnchor[] = []
    let successCount = 0
    let failedCount = 0

    logger.debug('Processing anchors for expansion', {
      count: anchors.length,
      ids: anchors.map((a) => a.id),
    })

    for (const anchor of anchors) {
      const variations = anchor.category === 'character'
        ? characterVariations
        : backgroundVariations

      const variationPrompts = anchor.category === 'character'
        ? CHARACTER_VARIATIONS
        : BACKGROUND_VARIATIONS

      // Generate each variation
      for (const variation of variations) {
        const prompt = variationPrompts[variation as CharacterVariation & BackgroundVariation]
        const aspectRatio = anchor.category === 'character'
          ? characterAspectRatio
          : backgroundAspectRatio

        logger.debug('Generating variation', {
          anchorId: anchor.id,
          variation,
          category: anchor.category,
        })

        const result = await editImage({
          prompt,
          referenceUrls: [anchor.url],
          aspectRatio,
          resolution,
        })

        logger.debug('Variation result', {
          id: `${anchor.id}-${variation}`,
          success: result.success,
          hasUrl: !!result.url,
        })

        if (result.success && result.url) {
          expanded.push({
            id: `${anchor.id}-${variation}`,
            originalId: anchor.id,
            category: anchor.category,
            name: anchor.name,
            variation,
            url: result.url,
          })
          successCount++
        } else {
          // On failure, use original URL with variation marker
          expanded.push({
            id: `${anchor.id}-${variation}`,
            originalId: anchor.id,
            category: anchor.category,
            name: anchor.name,
            variation,
            url: `${anchor.url}?variation=${variation}&error=true`,
          })
          failedCount++
        }
      }
    }

    return {
      sessionId,
      expanded,
      provider: getImageServiceProvider(),
      stats: {
        total: successCount + failedCount,
        success: successCount,
        failed: failedCount,
      },
    }
  }
)

// 앵커 확장은 여러 이미지를 순차적으로 생성하므로 긴 시간 필요
export const maxDuration = 300
