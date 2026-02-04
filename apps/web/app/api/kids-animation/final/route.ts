import { createApiHandler } from '@/lib/api'
import {
  FinalRequestSchema,
  type FinalResponse,
} from '@/lib/api/kids-animation/types'
import {
  composeVideo,
  generateThumbnail,
  getFinalServiceProvider,
} from '@/lib/services/final-service'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/kids-animation/final')

/**
 * POST /api/kids-animation/final
 *
 * 최종 편집 (영상 합성 + 썸네일)
 *
 * Flow:
 * 1. Creatomate로 비디오 클립 + TTS + BGM 합성
 * 2. nanobanana로 썸네일 생성
 * 3. (선택) 노래 버전 생성 - 추후 구현
 */
export const POST = createApiHandler<FinalResponse>(
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = FinalRequestSchema.parse(body)

    const { sessionId, shots, bgmUrl, style, songVersion } = validated

    logger.info('Final composition started', {
      requestId,
      sessionId,
      shotCount: shots.length,
      style,
      provider: getFinalServiceProvider(),
    })

    // Debug: 실제 전달된 데이터 로깅
    logger.debug('Final request data', {
      bgmUrl: bgmUrl ? bgmUrl.slice(0, 50) + '...' : 'EMPTY',
      shots: shots.map((s) => ({
        id: s.id,
        shotNumber: s.shotNumber,
        duration: s.duration,
        hasVideoUrl: !!s.videoUrl,
        hasAudioUrl: !!s.audioUrl,
        audioUrl: s.audioUrl ? s.audioUrl.slice(0, 50) + '...' : 'EMPTY',
      })),
    })

    // 1. Video Composition
    const composeResult = await composeVideo({
      sessionId,
      shots: shots.map((shot) => ({
        id: shot.id,
        shotNumber: shot.shotNumber,
        duration: shot.duration,
        videoUrl: shot.videoUrl,
        audioUrl: shot.audioUrl,
      })),
      bgmUrl,
      bgmVolume: 0.3, // 30% volume for BGM
      userId: user?.id,
      metadata: {
        style,
        requestId,
      },
    })

    if (!composeResult.success) {
      logger.error('Video composition failed', {
        requestId,
        sessionId,
        error: composeResult.error,
      })
      throw new Error(composeResult.error || 'Video composition failed')
    }

    logger.info('Video composition completed', {
      requestId,
      sessionId,
      videoUrl: composeResult.videoUrl,
      duration: composeResult.duration,
    })

    // 2. Thumbnail Generation
    // Extract story title from metadata if available, or generate a default
    const thumbnailTitle = `Kids Animation - ${style.charAt(0).toUpperCase() + style.slice(1)} Style`

    const thumbnailResult = await generateThumbnail({
      title: thumbnailTitle,
      style,
      userId: user?.id,
      sessionId,
    })

    // Thumbnail is non-critical - use fallback if generation fails
    const thumbnailUrl = thumbnailResult.success && thumbnailResult.url
      ? thumbnailResult.url
      : `https://picsum.photos/seed/${sessionId}/1280/720`

    if (!thumbnailResult.success) {
      logger.warn('Thumbnail generation failed, using fallback', {
        requestId,
        sessionId,
        error: thumbnailResult.error,
      })
    }

    // 3. Build response
    const result: FinalResponse = {
      sessionId,
      videoUrl: composeResult.videoUrl || '',
      thumbnailUrl,
      totalDuration: composeResult.duration || 0,
    }

    // 4. Song version (TODO: implement later)
    if (songVersion) {
      // Future: Generate song version with different audio track
      logger.info('Song version requested but not yet implemented', {
        requestId,
        sessionId,
      })
      // result.songVideoUrl = await generateSongVersion(...)
    }

    logger.info('Final composition completed', {
      requestId,
      sessionId,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.totalDuration,
    })

    return result
  }
)
