import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { imageToVideo, saveToLibrary } from '@/lib/services'
import { VideoRequestSchema } from '@/lib/api/kids-animation/types'
import { getLogger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const logger = getLogger('kids-animation/videos')

// API 라우트 타임아웃 설정 (5분 - Vercel Hobby 플랜 최대)
export const maxDuration = 300

/**
 * POST /api/kids-animation/videos
 *
 * 단일 비디오 생성 (이미지 → 비디오)
 *
 * Kling 2.6 API를 사용하여 샷 이미지를 비디오로 변환
 * - 클라이언트에서 순차적으로 호출
 * - 샷당 약 2-5분 소요
 */
export async function POST(request: Request) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 요청 파싱
    const body = await request.json()
    const validated = VideoRequestSchema.parse(body)

    const { sessionId, projectId, shot, formFactor = 'longform' } = validated
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const userId = user.id

    logger.info('Video generation request received', {
      sessionId,
      shotId: shot.id,
      shotNumber: shot.shotNumber,
      formFactor,
    })

    // 비디오 생성
    const result = await imageToVideo({
      imageUrl: shot.imageUrl,
      prompt: shot.visualPrompt,
      duration: (shot.duration === 10 ? '10' : '5') as '5' | '10',
    })

    const videoUrl = result.url || ''

    // 성공한 비디오만 라이브러리에 저장
    if (videoUrl && userId) {
      await saveToLibrary({
        userId,
        projectId,
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

    logger.info('Video generation completed', {
      sessionId,
      shotId: shot.id,
      shotNumber: shot.shotNumber,
      hasUrl: !!videoUrl,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: shot.id,
          shotNumber: shot.shotNumber,
          videoUrl,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logger.error('Video generation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '비디오 생성 실패',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
