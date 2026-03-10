import { createApiHandler } from '@/lib/api'
import { generateImage } from '@/lib/services'
import {
  MainVisualRequestSchema,
  type MainVisualResponse,
} from '@/lib/api/character/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'

const logger = getLogger('character/main-visual')

function buildPortraitPrompts(
  profile: { name: string; personality: string; visualDescription: string; backstory: string },
  count: number,
): string[] {
  const basePrompt = `Character portrait: ${profile.visualDescription}. Personality: ${profile.personality}. High quality, detailed character illustration, centered composition, clean background.`

  const variations = [
    `${basePrompt} Neutral expression, front-facing portrait.`,
    `${basePrompt} Confident pose, slight smile, dynamic angle.`,
    `${basePrompt} Three-quarter view, thoughtful expression.`,
    `${basePrompt} Action-ready pose, determined look, dramatic lighting.`,
    `${basePrompt} Relaxed pose, friendly expression, warm lighting.`,
    `${basePrompt} Profile view, contemplative mood, atmospheric.`,
    `${basePrompt} Close-up portrait, intense gaze, detailed features.`,
    `${basePrompt} Full body, signature pose, character essence.`,
  ]

  return variations.slice(0, count)
}

export const POST = createApiHandler<MainVisualResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = MainVisualRequestSchema.parse(body)

    const { sessionId, projectId, characterProfile, model, count } = validated
    const routeOverrides = buildRouteOverrides('character-creator', 'main-visual', 'text-to-image')
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
        }
      })
    )

    const images = settled
      .filter((s): s is PromiseFulfilledResult<{ id: string; url: string; prompt: string }> =>
        s.status === 'fulfilled'
      )
      .map((s) => s.value)
      .filter((img) => img.url.length > 0)

    logger.info('Portrait generation complete', {
      total: prompts.length,
      success: images.length,
      elapsedMs: Date.now() - startTime,
    })

    if (images.length === 0) {
      throw new Error('모든 초상화 생성에 실패했습니다. 다시 시도해주세요.')
    }

    return { sessionId, images }
  }
)

export const maxDuration = 300
