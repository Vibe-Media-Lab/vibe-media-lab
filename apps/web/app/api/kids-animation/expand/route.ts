import { createApiHandler } from '@/lib/api'
import { editImage, getImageServiceProvider } from '@/lib/services'
import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'
import { ExpandRequestSchema, type ExpandedAnchor, type ExpandResponse } from '@/lib/api/kids-animation/types'

const logger = getLogger('kids-animation/expand')

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
  async (request, { user }) => {
    const body = await request.json()
    const validated = ExpandRequestSchema.parse(body)

    const {
      sessionId,
      anchors,
      formFactor = 'longform',
      // front/wide는 앵커 원본을 사용하므로 제외
      characterVariations = ['three_quarter', 'happy', 'sad'],
      backgroundVariations = ['medium'],
      model,
    } = validated
    const routeOverrides = buildRouteOverrides('kids-animation', 'expand', 'image-to-image')

    // Get aspect ratios from form factor preset
    const preset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const characterAspectRatio = preset.anchor.character.aspectRatio
    const backgroundAspectRatio = preset.anchor.background.aspectRatio
    const resolution = preset.resolution

    // 유효한 URL이 있는 앵커만 확장 (생성 실패/mock URL 제외)
    const validAnchors = anchors.filter((a) => {
      if (!a.url || a.url.includes('picsum.photos')) {
        logger.warn('Skipping anchor with invalid URL', { id: a.id, url: a.url?.slice(0, 50) })
        return false
      }
      return true
    })

    logger.debug('Processing anchors for expansion', {
      count: validAnchors.length,
      skipped: anchors.length - validAnchors.length,
      ids: validAnchors.map((a) => a.id),
    })

    // 모든 변형 작업을 평탄화하여 병렬 실행
    const tasks = validAnchors.flatMap((anchor) => {
      const variations = anchor.category === 'character'
        ? characterVariations
        : backgroundVariations
      const variationPrompts = anchor.category === 'character'
        ? CHARACTER_VARIATIONS
        : BACKGROUND_VARIATIONS

      return variations.map((variation) => ({
        anchor,
        variation,
        prompt: variationPrompts[variation as CharacterVariation & BackgroundVariation],
        aspectRatio: anchor.category === 'character'
          ? characterAspectRatio
          : backgroundAspectRatio,
      }))
    })

    logger.debug('Parallel expansion tasks', { totalTasks: tasks.length })

    const expandStartTime = Date.now()
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        const result = await editImage({
          prompt: task.prompt,
          referenceUrls: [task.anchor.url],
          aspectRatio: task.aspectRatio,
          resolution,
          model,
          routeOverrides,
          userId: user.id,
          sessionId,
        })
        return { task, result }
      })
    )

    const expanded: ExpandedAnchor[] = []
    let successCount = 0
    let failedCount = 0

    for (const settled of results) {
      if (settled.status === 'fulfilled') {
        const { task, result } = settled.value
        if (result.success && result.url) {
          expanded.push({
            id: `${task.anchor.id}-${task.variation}`,
            originalId: task.anchor.id,
            category: task.anchor.category,
            name: task.anchor.name,
            variation: task.variation,
            url: result.url,
          })
          successCount++
        } else {
          expanded.push({
            id: `${task.anchor.id}-${task.variation}`,
            originalId: task.anchor.id,
            category: task.anchor.category,
            name: task.anchor.name,
            variation: task.variation,
            url: `${task.anchor.url}?variation=${task.variation}&error=true`,
          })
          failedCount++
        }
      } else {
        // Promise rejected
        const task = tasks[results.indexOf(settled)]
        if (task) {
          expanded.push({
            id: `${task.anchor.id}-${task.variation}`,
            originalId: task.anchor.id,
            category: task.anchor.category,
            name: task.anchor.name,
            variation: task.variation,
            url: `${task.anchor.url}?variation=${task.variation}&error=true`,
          })
          failedCount++
          logger.error('Expansion task rejected', {
            anchorId: task.anchor.id,
            variation: task.variation,
            error: settled.reason,
          })
        }
      }
    }

    const expandElapsedMs = Date.now() - expandStartTime
    logger.info('Expand completed', {
      sessionId,
      totalTasks: tasks.length,
      successCount,
      failedCount,
      elapsedMs: expandElapsedMs,
    })

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
  },
  { rateLimit: { maxRequests: 10, windowMs: 60_000 } }
)

// 앵커 확장은 병렬 생성하지만 태스크 수에 따라 시간 소요
export const maxDuration = 300
