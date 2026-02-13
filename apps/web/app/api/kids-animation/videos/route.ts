import { KIDS_FORM_FACTOR_PRESETS, ApiError } from '@vibe-media-lab/shared'
import { imageToVideo, saveToLibrary, getVideoServiceProvider } from '@/lib/services'
import { VideoRequestSchema } from '@/lib/api/kids-animation/types'
import { VIDEO_MODELS } from '@/lib/constants/model-options'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'
import { createApiHandler } from '@/lib/api'

const logger = getLogger('kids-animation/videos')

// API 라우트 타임아웃 설정 (5분 - Vercel Hobby 플랜 최대)
export const maxDuration = 300

/**
 * POST /api/kids-animation/videos
 *
 * 단일 비디오 생성 (이미지 → 비디오)
 *
 * Primary: fal.ai Kling 2.6 Pro / Fallback: kieai Kling 2.6
 * - 클라이언트에서 순차적으로 호출
 * - 샷당 약 2-5분 소요
 */
export const POST = createApiHandler(
  async (request, { user }) => {
    const body = await request.json()
    const validated = VideoRequestSchema.parse(body)

    const { sessionId, projectId, shot, formFactor = 'longform', model } = validated
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const userId = user.id

    logger.info('Video generation request received', {
      sessionId,
      shotId: shot.id,
      shotNumber: shot.shotNumber,
      formFactor,
    })

    // 비디오 생성
    const videoStartTime = Date.now()
    const result = await imageToVideo({
      imageUrl: shot.imageUrl,
      prompt: shot.visualPrompt,
      duration: (shot.duration === 10 ? '10' : '5') as '5' | '10',
      aspectRatio: formFactorPreset.video.aspectRatio,
      model,
      routeOverrides: buildRouteOverrides('kids-animation', 'videos', 'image-to-video'),
    })

    const videoElapsedMs = Date.now() - videoStartTime
    logger.info('Video generation result', {
      sessionId,
      shotId: shot.id,
      success: result.success,
      elapsedMs: videoElapsedMs,
    })

    // 생성 실패 시 502 에러 반환 (클라이언트가 response.ok로 처리)
    if (!result.success) {
      logger.error('Video generation failed', {
        sessionId,
        shotId: shot.id,
        error: result.error,
        elapsedMs: videoElapsedMs,
      })

      throw ApiError.providerError(result.error || '비디오 생성 실패', getVideoServiceProvider())
    }

    const videoUrl = result.url || ''

    if (!videoUrl) {
      logger.warn('Video generation succeeded but returned empty URL', {
        sessionId,
        shotId: shot.id,
        metadata: result.metadata,
      })
    }

    // 성공한 비디오만 라이브러리에 저장
    if (videoUrl && userId) {
      await saveToLibrary({
        userId,
        projectId,
        mediaType: 'video',
        prompt: shot.visualPrompt,
        outputUrl: videoUrl,
        provider: getVideoServiceProvider(),
        model: model || VIDEO_MODELS.defaultModelId,
        durationSeconds: shot.duration || 10,
        config: {
          sessionId,
          shotId: shot.id,
          shotNumber: shot.shotNumber,
          sourceImage: shot.imageUrl,
        },
      })
    }

    logger.info('Video generation completed', {
      sessionId,
      shotId: shot.id,
      shotNumber: shot.shotNumber,
      hasUrl: !!videoUrl,
    })

    return {
      id: shot.id,
      shotNumber: shot.shotNumber,
      videoUrl,
    }
  },
  { rateLimit: { maxRequests: 5, windowMs: 60_000 } }
)
