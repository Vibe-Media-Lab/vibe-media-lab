import { createApiHandler } from '@/lib/api'
import { generateImage } from '@/lib/services'
import {
  MainVisualRequestSchema,
  type MainVisualResponse,
} from '@/lib/api/character/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { buildStyledPortraitPrompt, buildPortraitPrompts } from '@/lib/prompts/character-prompt-builder'
import { getLogger } from '@/lib/logger'

const logger = getLogger('character/main-visual')

export const POST = createApiHandler<MainVisualResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = MainVisualRequestSchema.parse(body)

    const { sessionId, projectId, characterProfile, model, count, regenerateIndex, styleHint } = validated
    const routeOverrides = buildRouteOverrides('character-creator', 'main-visual', 'text-to-image')

    // 단일 항목 재생성 모드
    if (regenerateIndex !== undefined) {
      const desc = characterProfile.visualDescriptions?.[regenerateIndex] || characterProfile.visualDescription
      const prompt = buildStyledPortraitPrompt(desc, styleHint)

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
    const prompts = buildPortraitPrompts(characterProfile, count, styleHint)
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
