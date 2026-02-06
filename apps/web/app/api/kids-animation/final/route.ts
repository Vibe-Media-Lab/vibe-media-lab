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
import { processBGM } from '@/lib/services/bgm-processor'
import { uploadMedia } from '@/lib/services/supabase-storage'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/kids-animation/final')

/**
 * POST /api/kids-animation/final
 *
 * 최종 편집 (BGM 전처리 + 영상 합성 + 썸네일)
 *
 * Flow:
 * 1. FFmpeg로 BGM 전처리 (시작부 + 크로스페이드 + 끝부분 = 목표 길이)
 * 2. fal.ai FFmpeg로 비디오 클립 + TTS + 편집된 BGM 합성
 * 3. nanobanana로 썸네일 생성
 * 4. (선택) 노래 버전 생성 - 추후 구현
 */
export const POST = createApiHandler<FinalResponse>(
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = FinalRequestSchema.parse(body)

    const { sessionId, projectId, shots, bgmUrl, style, songVersion,
            storyTitle, storyLogline, characters, anchorUrls } = validated

    // 총 예상 영상 길이 계산
    const expectedDurationSec = shots.reduce((sum, s) => sum + s.duration, 0)

    logger.info('Final composition started', {
      requestId,
      sessionId,
      shotCount: shots.length,
      expectedDurationSec,
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

    // 1. BGM 전처리 (목표 길이에 맞춰 편집 + 페이드아웃)
    let processedBgmUrl = bgmUrl

    if (bgmUrl) {
      logger.info('Processing BGM to fit target duration', {
        requestId,
        sessionId,
        targetDurationSec: expectedDurationSec,
      })

      const bgmResult = await processBGM({
        bgmUrl,
        targetDurationSec: expectedDurationSec,
        fadeOutSec: 2, // 끝 2초 페이드아웃
        volume: 0.25, // 25% 볼륨 - 나레이션보다 낮게
      })

      if (bgmResult.success && bgmResult.audioBuffer) {
        // 편집된 BGM 업로드
        const uploadResult = await uploadMedia({
          file: bgmResult.audioBuffer,
          userId: user?.id || 'anonymous',
          mediaType: 'video', // audio bucket이 없으면 video 사용
          filename: `bgm-processed-${sessionId}.mp3`,
          contentType: 'audio/mpeg',
        })

        if (uploadResult.success && uploadResult.url) {
          processedBgmUrl = uploadResult.url
          logger.info('BGM processed and uploaded', {
            requestId,
            sessionId,
            processedBgmUrl: processedBgmUrl.slice(0, 50) + '...',
            durationSec: expectedDurationSec,
          })
        } else {
          logger.warn('Failed to upload processed BGM, using original', {
            error: uploadResult.error,
          })
        }
      } else {
        logger.warn('Failed to process BGM, using original', {
          error: bgmResult.error,
        })
      }
    }

    // 2. Video Composition (편집된 BGM 사용)
    const composeResult = await composeVideo({
      sessionId,
      projectId,
      shots: shots.map((shot) => ({
        id: shot.id,
        shotNumber: shot.shotNumber,
        duration: shot.duration,
        videoUrl: shot.videoUrl,
        audioUrl: shot.audioUrl,
      })),
      bgmUrl: processedBgmUrl,
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

    // 3. Thumbnail Generation
    const thumbnailResult = await generateThumbnail({
      title: storyTitle || `Kids Animation - ${style.charAt(0).toUpperCase() + style.slice(1)} Style`,
      style,
      logline: storyLogline,
      characters: characters?.map(c => ({
        name: c.name,
        visualDescription: c.visualDescription,
      })),
      referenceUrls: anchorUrls,
      userId: user?.id,
      projectId,
      sessionId,
    })

    // Thumbnail is non-critical - use fallback if generation fails
    const thumbnailUrl =
      thumbnailResult.success && thumbnailResult.url
        ? thumbnailResult.url
        : `https://picsum.photos/seed/${sessionId}/1280/720`

    if (!thumbnailResult.success) {
      logger.warn('Thumbnail generation failed, using fallback', {
        requestId,
        sessionId,
        error: thumbnailResult.error,
      })
    }

    // 4. Build response
    const result: FinalResponse = {
      sessionId,
      videoUrl: composeResult.videoUrl || '',
      thumbnailUrl,
      totalDuration: expectedDurationSec,
    }

    // 5. Song version (TODO: implement later)
    if (songVersion) {
      logger.info('Song version requested but not yet implemented', {
        requestId,
        sessionId,
      })
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

// BGM processing + video composition can take a while
export const maxDuration = 300
