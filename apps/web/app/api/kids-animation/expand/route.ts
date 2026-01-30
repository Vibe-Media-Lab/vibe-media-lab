import { createApiHandler } from '@/lib/api'
import { z } from 'zod'
import { editImage, getImageServiceProvider } from '@/lib/services'
import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'

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
 */
const CHARACTER_VARIATIONS = {
  front: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. Front view, facing directly at camera. Full body visible. Neutral relaxed expression. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
  three_quarter: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. Three-quarter view, slight angle showing depth. Full body visible. Neutral expression. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
  happy: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. Front view. Happy joyful expression with big genuine smile, eyes slightly squinted with joy. Full body visible. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
  sad: 'Generate the exact same character from the reference image. Disney Pixar 3D animation style. Front view. Sad melancholic expression, downcast eyes, slightly drooping posture. Full body visible. Simple solid gray background. Maintain identical clothing, colors, proportions, and design details.',
} as const

/**
 * 배경 변형 프롬프트 (Gemini 3 Pro Image 최적화)
 */
const BACKGROUND_VARIATIONS = {
  wide: 'Generate the exact same location from the reference image. Disney Pixar 3D animation style. Wide establishing shot, panoramic view showing the full environment. No characters present. Cinematic lighting with depth and atmosphere. Maintain identical architectural details, colors, and mood.',
  medium: 'Generate the exact same location from the reference image. Disney Pixar 3D animation style. Medium shot with balanced framing, leaving space in foreground for characters. No characters present. Cinematic lighting. Maintain identical architectural details, colors, and mood.',
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
  characterVariations: z.array(z.enum(['front', 'three_quarter', 'happy', 'sad'])).optional(),
  backgroundVariations: z.array(z.enum(['wide', 'medium'])).optional(),
})

/**
 * POST /api/kids-animation/expand
 *
 * 앵커 이미지를 다양한 각도/표정으로 확장
 *
 * - 캐릭터: front, three_quarter, happy, sad (4종)
 * - 배경: wide, medium (2종)
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
      characterVariations = ['front', 'three_quarter', 'happy', 'sad'],
      backgroundVariations = ['wide', 'medium'],
    } = validated

    // Get aspect ratios from form factor preset
    const preset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const characterAspectRatio = preset.anchor.character.aspectRatio
    const backgroundAspectRatio = preset.anchor.background.aspectRatio
    const resolution = preset.resolution

    const expanded: ExpandedAnchor[] = []
    let successCount = 0
    let failedCount = 0

    // Process each anchor
    console.log('[expand] Processing anchors:', anchors.map(a => ({ id: a.id, category: a.category, url: a.url })))

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

        console.log(`[expand] Generating ${anchor.id}-${variation}, referenceUrl: ${anchor.url}`)

        const result = await editImage({
          prompt,
          referenceUrls: [anchor.url],
          aspectRatio,
          resolution,
        })

        console.log(`[expand] Result for ${anchor.id}-${variation}:`, { success: result.success, url: result.url?.slice(0, 50), error: result.error })

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
