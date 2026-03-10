import { createApiHandler } from '@/lib/api'
import { editImage } from '@/lib/services'
import {
  CharacterSheetRequestSchema,
  type CharacterSheetResponse,
} from '@/lib/api/character/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import type { RouteOverrides } from '@/lib/models/router'
import { validateFetchUrl } from '@/lib/security/validate-url'
import { getLogger } from '@/lib/logger'

const logger = getLogger('character/character-sheet')

const VARIATIONS = [
  { id: 'front_view', label: '정면', prompt: 'Front view, facing camera directly, neutral expression' },
  { id: 'three_quarter', label: '3/4 뷰', prompt: 'Three-quarter view, slightly turned, natural pose' },
  { id: 'happy_expression', label: '행복 표정', prompt: 'Happy expression, bright smile, joyful mood' },
  { id: 'action_pose', label: '액션 포즈', prompt: 'Action pose, dynamic movement, energetic' },
]

function generateSheet(
  variation: typeof VARIATIONS[number],
  params: { selectedImageUrl: string; characterProfile: { visualDescription: string }; model?: string; routeOverrides: RouteOverrides | undefined; userId: string; projectId?: string; sessionId: string },
) {
  const editPrompt = `${variation.prompt}. Character: ${params.characterProfile.visualDescription}. Keep the same character design, colors, and style. 1:1 aspect ratio, clean background.`

  return editImage({
    prompt: editPrompt,
    referenceUrls: [params.selectedImageUrl],
    aspectRatio: '1:1',
    model: params.model,
    routeOverrides: params.routeOverrides,
    userId: params.userId,
    projectId: params.projectId,
    sessionId: params.sessionId,
    metadata: {
      type: 'character-sheet',
      variation: variation.id,
    },
  }).then((result) => ({
    id: variation.id,
    url: result.success ? (result.url || '') : '',
    variation: variation.label,
    status: (result.success && result.url) ? 'completed' as const : 'failed' as const,
  }))
}

export const POST = createApiHandler<CharacterSheetResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = CharacterSheetRequestSchema.parse(body)

    const { sessionId, projectId, selectedImageUrl, characterProfile, model, regenerateVariationId } = validated

    validateFetchUrl(selectedImageUrl, { endpoint: '/api/character/character-sheet', userId: user.id })

    const routeOverrides = buildRouteOverrides('character-creator', 'character-sheet', 'image-to-image')

    const sheetParams = {
      selectedImageUrl,
      characterProfile,
      model,
      routeOverrides,
      userId: user.id,
      projectId,
      sessionId,
    }

    // 단일 변형 재생성 모드
    if (regenerateVariationId) {
      const variation = VARIATIONS.find((v) => v.id === regenerateVariationId)
      if (!variation) {
        throw new Error(`유효하지 않은 변형 ID: ${regenerateVariationId}`)
      }

      logger.debug('Regenerating single character sheet', { regenerateVariationId, model })

      const sheet = await generateSheet(variation, sheetParams)

      return {
        sessionId,
        selectedImageUrl,
        characterName: characterProfile.name,
        characterDescription: characterProfile.visualDescription,
        sheets: [sheet],
      }
    }

    // 전체 생성 모드
    logger.debug('Starting character sheet generation', {
      variationCount: VARIATIONS.length,
      model,
    })

    const startTime = Date.now()
    const settled = await Promise.allSettled(
      VARIATIONS.map((variation) => generateSheet(variation, sheetParams))
    )

    const sheets = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { id: VARIATIONS[i]!.id, url: '', variation: VARIATIONS[i]!.label, status: 'failed' as const }
    )

    const successCount = sheets.filter((s) => s.status === 'completed').length

    logger.info('Character sheet generation complete', {
      total: VARIATIONS.length,
      success: successCount,
      elapsedMs: Date.now() - startTime,
    })

    if (successCount === 0) {
      throw new Error('모든 캐릭터 시트 생성에 실패했습니다. 다시 시도해주세요.')
    }

    return {
      sessionId,
      selectedImageUrl,
      characterName: characterProfile.name,
      characterDescription: characterProfile.visualDescription,
      sheets,
    }
  },
  { rateLimit: { maxRequests: 5, windowMs: 60_000 } }
)

export const maxDuration = 300
