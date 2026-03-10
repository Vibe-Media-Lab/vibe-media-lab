import { createApiHandler } from '@/lib/api'
import { generateImage } from '@/lib/services'
import {
  MainVisualRequestSchema,
  type MainVisualResponse,
} from '@/lib/api/character/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'

const logger = getLogger('character/main-visual')

function buildPortraitPrompt(visualDescription: string): string {
  return `Full-body character illustration: ${visualDescription}. Front-facing, full body from head to toe, centered composition, plain white background, no environment, no props, high quality detailed character design.`
}

function buildPortraitPrompts(
  profile: { name: string; personality: string; visualDescription: string; visualDescriptions?: string[]; backstory: string },
  count: number,
): string[] {
  // visualDescriptions 배열이 있으면 각 변형별 정면 고정 초상화
  if (profile.visualDescriptions?.length) {
    return profile.visualDescriptions.slice(0, count).map(buildPortraitPrompt)
  }
  // fallback: 단수 visualDescription으로 count만큼 생성
  return Array.from({ length: count }, () =>
    buildPortraitPrompt(profile.visualDescription)
  )
}

export const POST = createApiHandler<MainVisualResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = MainVisualRequestSchema.parse(body)

    const { sessionId, projectId, characterProfile, model, count, regenerateIndex } = validated
    const routeOverrides = buildRouteOverrides('character-creator', 'main-visual', 'text-to-image')

    // 단일 항목 재생성 모드
    if (regenerateIndex !== undefined) {
      // 재생성 시에도 해당 인덱스의 description 사용
      const desc = characterProfile.visualDescriptions?.[regenerateIndex] || characterProfile.visualDescription
      const prompt = buildPortraitPrompt(desc)

      logger.debug('Regenerating single portrait', { regenerateIndex, model })

      const result = await generateImage({
        prompt,
        aspectRatio: '1:1',
        model,
        routeOverrides,
        userId: user.id,
        projectId,
        sessionId,
        metadata: {
          type: 'character-portrait',
          index: regenerateIndex,
          regenerate: true,
        },
      })

      const image = {
        id: `portrait-${regenerateIndex + 1}`,
        url: result.success ? (result.url || '') : '',
        prompt,
        status: (result.success && result.url) ? 'completed' as const : 'failed' as const,
      }

      return { sessionId, images: [image] }
    }

    // 전체 생성 모드
    const prompts = buildPortraitPrompts(characterProfile, count)
    logger.debug('Starting portrait generation', {
      count: prompts.length,
      model,
    })

    const startTime = Date.now()
    const settled = await Promise.allSettled(
      prompts.map(async (prompt, i) => {
        const result = await generateImage({
          prompt,
          aspectRatio: '1:1',
          model,
          routeOverrides,
          userId: user.id,
          projectId,
          sessionId,
          metadata: {
            type: 'character-portrait',
            index: i,
          },
        })

        return {
          id: `portrait-${i + 1}`,
          url: result.success ? (result.url || '') : '',
          prompt,
          status: (result.success && result.url) ? 'completed' as const : 'failed' as const,
        }
      })
    )

    const images = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { id: `portrait-${i + 1}`, url: '', prompt: prompts[i]!, status: 'failed' as const }
    )

    const successCount = images.filter((img) => img.status === 'completed').length

    logger.info('Portrait generation complete', {
      total: prompts.length,
      success: successCount,
      elapsedMs: Date.now() - startTime,
    })

    if (successCount === 0) {
      throw new Error('모든 초상화 생성에 실패했습니다. 다시 시도해주세요.')
    }

    return { sessionId, images }
  },
  { rateLimit: { maxRequests: 5, windowMs: 60_000 } }
)

export const maxDuration = 300
