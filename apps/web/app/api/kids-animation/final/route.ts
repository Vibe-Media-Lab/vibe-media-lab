import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_THUMBNAIL_STYLES } from '@vibe-media-lab/shared'
import {
  FinalRequestSchema,
  type FinalResponse,
} from '@/lib/api/kids-animation/types'

/**
 * POST /api/kids-animation/final
 *
 * 최종 편집 (영상 합성 + 썸네일 + 노래 버전)
 *
 * TODO: 실제 구현 시
 * - ffmpeg로 비디오 + TTS + BGM 합성
 * - nanobanana_generate로 썸네일 생성
 * - (선택) 노래 버전 생성
 */
export const POST = createApiHandler<FinalResponse>(
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = FinalRequestSchema.parse(body)

    const { sessionId, shots, bgmUrl, style, songVersion } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]

    // 총 재생 시간 계산
    const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0)

    // Mock 최종 결과
    // 실제 구현 시:
    // 1. ffmpeg로 모든 비디오 + TTS 합성
    // 2. BGM 오버레이
    // 3. 썸네일 생성 (nanobanana)
    // 4. (선택) 노래 버전 생성

    const result: FinalResponse = {
      sessionId,
      videoUrl: '', // 실제 구현 시 최종 비디오 URL
      thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/1280/720`, // 실제 구현 시 생성된 썸네일
      totalDuration,
    }

    if (songVersion) {
      result.songVideoUrl = '' // 실제 구현 시 노래 버전 URL
    }

    return result
  }
)
