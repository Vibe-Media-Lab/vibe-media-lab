import { z } from 'zod'
import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { editImage } from '@/lib/services'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/kids-animation/shots/regenerate')

const MAX_RETRIES = 2

const ShotRegenerateSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  shotId: z.string(),
  visualPrompt: z.string(),
  anchorUrls: z.array(z.string()),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
})

interface ShotRegenerateResponse {
  shotId: string
  imageUrl: string
}

/**
 * POST /api/kids-animation/shots/regenerate
 *
 * 개별 샷 이미지 재생성
 */
export const POST = createApiHandler<ShotRegenerateResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = ShotRegenerateSchema.parse(body)

    const { sessionId, projectId, shotId, visualPrompt, anchorUrls, style, formFactor } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]

    const prompt = `${visualPrompt}. ${styleConfig.visualPromptSuffix}`

    logger.info('Shot regeneration request', {
      sessionId,
      shotId,
      style,
      formFactor,
      anchorCount: anchorUrls.length,
      anchorUrls: anchorUrls.map(u => u.slice(0, 100)),
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 300),
      aspectRatio: formFactorPreset.shot.aspectRatio,
      resolution: formFactorPreset.shot.resolution,
    })

    // 재시도 로직 (배치 생성과 동일 패턴 — Gemini finishReason: OTHER 대응)
    let lastError: string | undefined
    let lastDiagnostics: Record<string, unknown> | undefined
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        logger.info('Shot regeneration retry', { sessionId, shotId, attempt })
      }

      const result = await editImage({
        prompt,
        referenceUrls: anchorUrls,
        aspectRatio: formFactorPreset.shot.aspectRatio,
        resolution: formFactorPreset.shot.resolution,
        userId: user.id,
        projectId,
        sessionId,
        metadata: { style, formFactor, regenerate: true, retryAttempt: attempt },
      })

      if (result.success && result.url) {
        logger.info('Shot image regeneration completed', {
          sessionId,
          shotId,
          attempt,
          url: result.url.slice(0, 50),
        })
        return { shotId, imageUrl: result.url }
      }

      lastError = result.error
      lastDiagnostics = result.metadata?.geminiDiagnostics as Record<string, unknown> | undefined
      logger.warn('Shot regeneration attempt failed', {
        sessionId,
        shotId,
        attempt,
        error: lastError,
        diagnostics: lastDiagnostics,
      })
    }

    // diagnostics를 에러 메시지에 포함하여 클라이언트에서 원인 확인 가능
    const diagSummary = lastDiagnostics
      ? ` | blockReason=${(lastDiagnostics.promptFeedback as Record<string, unknown>)?.blockReason ?? 'none'}, safetyRatings=${JSON.stringify(lastDiagnostics.candidateSafetyRatings ?? [])}`
      : ''
    throw new Error((lastError || '샷 이미지 재생성에 실패했습니다') + diagSummary)
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)

export const maxDuration = 300
