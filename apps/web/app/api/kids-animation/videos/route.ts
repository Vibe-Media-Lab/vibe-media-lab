import { KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { imageToVideo, saveToLibrary } from '@/lib/services'
import { VideosRequestSchema } from '@/lib/api/kids-animation/types'
import { getLogger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const logger = getLogger('kids-animation/videos')

// API 라우트 타임아웃 설정 (10분 - SSE 스트리밍용)
export const maxDuration = 600

/**
 * SSE 이벤트 타입
 */
interface SSEEvent {
  type: 'progress' | 'item_complete' | 'complete' | 'error'
  data: {
    current?: number
    total?: number
    itemId?: string
    itemIndex?: number
    videoUrl?: string
    message?: string
    shots?: Array<{
      id: string
      shotNumber: number
      videoUrl: string
    }>
    sessionId?: string
  }
}

/**
 * SSE 메시지 포맷
 */
function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/**
 * POST /api/kids-animation/videos
 *
 * 비디오 생성 (이미지 → 비디오) - SSE 스트리밍
 *
 * Kling 2.6 API를 사용하여 각 샷 이미지를 비디오로 변환
 * - 순차 처리하면서 SSE로 진행 상황 실시간 전송
 * - 각 샷 완료시마다 클라이언트에 알림
 */
export async function POST(request: Request) {
  const encoder = new TextEncoder()

  try {
    // 인증 확인
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 요청 파싱
    const body = await request.json()
    const validated = VideosRequestSchema.parse(body)

    const { sessionId, shots, formFactor = 'longform' } = validated
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const userId = user.id

    logger.info('Video generation SSE request received', {
      sessionId,
      shotCount: shots.length,
      formFactor,
      shotIds: shots.map((s) => s.id),
    })

    // SSE 스트림 생성
    const stream = new ReadableStream({
      async start(controller) {
        const results: Array<{
          id: string
          shotNumber: number
          videoUrl: string
        }> = []

        try {
          // 시작 이벤트
          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: 'progress',
                data: {
                  current: 0,
                  total: shots.length,
                  message: '비디오 생성 시작...',
                },
              })
            )
          )

          // 순차적으로 비디오 생성
          for (let i = 0; i < shots.length; i++) {
            const shot = shots[i]
            if (!shot) continue

            logger.info(`Processing video ${i + 1}/${shots.length}`, {
              sessionId,
              shotId: shot.id,
              shotNumber: shot.shotNumber,
            })

            // 진행 상황 전송
            controller.enqueue(
              encoder.encode(
                formatSSE({
                  type: 'progress',
                  data: {
                    current: i,
                    total: shots.length,
                    itemId: shot.id,
                    itemIndex: i,
                    message: `비디오 ${i + 1}/${shots.length} 생성 중...`,
                  },
                })
              )
            )

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

            const shotResult = {
              id: shot.id,
              shotNumber: shot.shotNumber,
              videoUrl,
            }
            results.push(shotResult)

            // 개별 완료 이벤트
            controller.enqueue(
              encoder.encode(
                formatSSE({
                  type: 'item_complete',
                  data: {
                    current: i + 1,
                    total: shots.length,
                    itemId: shot.id,
                    itemIndex: i,
                    videoUrl,
                    message: videoUrl
                      ? `비디오 ${i + 1}/${shots.length} 완료`
                      : `비디오 ${i + 1}/${shots.length} 실패`,
                  },
                })
              )
            )

            logger.info(`Video ${i + 1}/${shots.length} completed`, {
              sessionId,
              shotId: shot.id,
              hasUrl: !!videoUrl,
            })
          }

          // 결과 요약 로깅
          const successShots = results.filter((v) => v.videoUrl)
          const failedShots = results.filter((v) => !v.videoUrl)

          logger.info('Video generation completed', {
            sessionId,
            total: shots.length,
            success: successShots.length,
            failed: failedShots.length,
          })

          // 완료 이벤트
          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: 'complete',
                data: {
                  sessionId,
                  shots: results,
                  message: '모든 비디오 생성 완료',
                },
              })
            )
          )
        } catch (error) {
          logger.error('Video generation SSE error', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })

          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: 'error',
                data: {
                  message:
                    error instanceof Error
                      ? error.message
                      : '비디오 생성 중 오류 발생',
                },
              })
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('Video generation request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '요청 처리 실패',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
