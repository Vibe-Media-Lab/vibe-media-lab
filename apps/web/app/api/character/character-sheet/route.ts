import { createApiHandler } from '@/lib/api'
import { editImage } from '@/lib/services'
import {
  CharacterSheetRequestSchema,
  type CharacterSheetResponse,
} from '@/lib/api/character/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'

const logger = getLogger('character/character-sheet')

const VARIATIONS = [
  { id: 'front_view', label: '정면', prompt: 'Front view, facing camera directly, neutral expression' },
  { id: 'three_quarter', label: '3/4 뷰', prompt: 'Three-quarter view, slightly turned, natural pose' },
  { id: 'happy_expression', label: '행복 표정', prompt: 'Happy expression, bright smile, joyful mood' },
  { id: 'action_pose', label: '액션 포즈', prompt: 'Action pose, dynamic movement, energetic' },
]

export const POST = createApiHandler<CharacterSheetResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = CharacterSheetRequestSchema.parse(body)

    const { sessionId, projectId, selectedImageUrl, characterProfile, model } = validated
    const routeOverrides = buildRouteOverrides('character-creator', 'character-sheet', 'image-to-image')

    logger.debug('Starting character sheet generation', {
      variationCount: VARIATIONS.length,
      model,
    })

    const startTime = Date.now()
    const settled = await Promise.allSettled(
      VARIATIONS.map(async (variation) => {
        const editPrompt = `${variation.prompt}. Character: ${characterProfile.visualDescription}. Keep the same character design, colors, and style. 1:1 aspect ratio, clean background.`

        const result = await editImage({
          prompt: editPrompt,
          referenceUrls: [selectedImageUrl],
          aspectRatio: '1:1',
          model,
          routeOverrides,
          userId: user.id,
          projectId,
          sessionId,
          metadata: {
            type: 'character-sheet',
            variation: variation.id,
          },
        })

        return {
          id: variation.id,
          url: result.success ? (result.url || '') : '',
          variation: variation.label,
        }
      })
    )

    const sheets = settled
      .filter((s): s is PromiseFulfilledResult<{ id: string; url: string; variation: string }> =>
        s.status === 'fulfilled'
      )
      .map((s) => s.value)
      .filter((sheet) => sheet.url.length > 0)

    logger.info('Character sheet generation complete', {
      total: VARIATIONS.length,
      success: sheets.length,
      elapsedMs: Date.now() - startTime,
    })

    if (sheets.length === 0) {
      throw new Error('모든 캐릭터 시트 생성에 실패했습니다. 다시 시도해주세요.')
    }

    return {
      sessionId,
      selectedImageUrl,
      characterName: characterProfile.name,
      characterDescription: characterProfile.visualDescription,
      sheets,
    }
  }
)

export const maxDuration = 300
