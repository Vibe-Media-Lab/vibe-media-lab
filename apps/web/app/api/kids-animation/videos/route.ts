import { createApiHandler } from '@/lib/api'
import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { generateVideosSequentially, saveToLibrary } from '@/lib/services'
import {
  VideosRequestSchema,
  type VideosResponse,
} from '@/lib/api/kids-animation/types'
import { getLogger } from '@/lib/logger'

const logger = getLogger('kids-animation/videos')

// API 라우트 타임아웃 설정 (5분)
export const maxDuration = 300

/**
 * POST /api/kids-animation/videos
 *
 * 비디오 생성 (이미지 → 비디오)
 *
 * Kling 2.6 API를 사용하여 각 샷 이미지를 비디오로 변환
 * - 순차 처리 (배치 API는 이미지 매핑 이슈 있음)
 * - 샷당 약 2-5분 소요
 */
export const POST = createApiHandler<VideosResponse>(
  async (request, context) => {
    const body = await request.json()
    const validated = VideosRequestSchema.parse(body)

    const { sessionId, shots, formFactor = 'longform' } = validated
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const userId = context.user.id

    logger.info('Video generation request received', {
      sessionId,
      shotCount: shots.length,
      formFactor,
      shotIds: shots.map((s) => s.id),
    })

    // 비디오 생성 태스크 준비
    const tasks = shots.map((shot) => ({
      imageUrl: shot.imageUrl,
      prompt: shot.visualPrompt,
      duration: (shot.duration === 10 ? '10' : '5') as '5' | '10',
    }))

    // 순차적으로 비디오 생성 (Kling API)
    const results = await generateVideosSequentially(tasks)

    // 결과 매핑 및 라이브러리 저장
    const videosData = await Promise.all(
      shots.map(async (shot, idx) => {
        const result = results[idx]
        const videoUrl = result?.url || ''

        // 성공한 비디오만 라이브러리에 저장
        if (videoUrl && userId) {
          await saveToLibrary({
            userId,
            mediaType: 'video',
            prompt: shot.visualPrompt,
            outputUrl: videoUrl,
            provider: 'kieai',
            model: 'kling-2.6/image-to-video',
            durationSeconds: shot.duration || 10,
            config: {
              sessionId,
              shotId: shot.id,
              shotNumber: shot.shotNumber,
              sourceImage: shot.imageUrl,
            },
          })
        }

        return {
          id: shot.id,
          shotNumber: shot.shotNumber,
          videoUrl,
        }
      })
    )

    // 결과 요약 로깅
    const successShots = videosData.filter((v) => v.videoUrl)
    const failedShots = videosData.filter((v) => !v.videoUrl)

    logger.info('Video generation completed', {
      sessionId,
      total: shots.length,
      success: successShots.length,
      failed: failedShots.length,
      failedShotIds: failedShots.map((s) => s.id),
    })

    if (failedShots.length > 0) {
      logger.warn('Some videos failed', {
        sessionId,
        failedShots: failedShots.map((s) => ({
          id: s.id,
          shotNumber: s.shotNumber,
        })),
      })
    }

    return {
      sessionId,
      shots: videosData,
    }
  }
)
