import { createApiHandler } from '@/lib/api'
import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import {
  VideosRequestSchema,
  type VideosResponse,
} from '@/lib/api/kids-animation/types'

/**
 * POST /api/kids-animation/videos
 *
 * 비디오 생성 (이미지 → 비디오)
 *
 * TODO: 실제 Kling API 연동 시 구현
 * - imageToVideo로 각 샷 이미지를 비디오로 변환
 * - formFactor에 따른 aspectRatio 적용 (16:9 또는 9:16)
 */
export const POST = createApiHandler<VideosResponse>(
  async (request) => {
    const body = await request.json()
    const validated = VideosRequestSchema.parse(body)

    const { sessionId, shots, formFactor = 'longform' } = validated
    const formFactorConfig = KIDS_FORM_FACTOR_PRESETS[formFactor]

    // Mock 비디오 생성
    // 실제 구현 시: 순차적으로 imageToVideo 호출
    // aspectRatio: formFactorConfig.video.aspectRatio
    const videosData = shots.map((shot) => ({
      id: shot.id,
      shotNumber: shot.shotNumber,
      videoUrl: '', // 실제 구현 시 생성된 비디오 URL
    }))

    return {
      sessionId,
      shots: videosData,
    }
  }
)
