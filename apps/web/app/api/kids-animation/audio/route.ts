import { createApiHandler } from '@/lib/api'
import { generateTTS, generateBGM, estimateTTSDuration } from '@/lib/services'
import {
  AudioRequestSchema,
  type AudioResponse,
} from '@/lib/api/kids-animation/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/kids-animation/audio')

/**
 * POST /api/kids-animation/audio
 *
 * 오디오 생성 (TTS + BGM)
 *
 * 재생성 지원:
 * - existingTts가 있으면 audioUrl이 비어있는 shot만 재생성
 * - existingBgm이 있으면 BGM 생성 스킵
 */
export const POST = createApiHandler<AudioResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = AudioRequestSchema.parse(body)

    const { sessionId, projectId, shots, bgmPrompt, bgmDirection, existingTts, existingBgm, ttsModel, bgmModel } = validated

    // 총 영상 길이 계산 (샷 수 × 10초)
    const totalDurationSec = shots.length * 10
    const durationMinutes = Math.round(totalDurationSec / 60)
    const durationHint = `Keep it short, around ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''} (${totalDurationSec} seconds). Do not exceed ${totalDurationSec + 10} seconds.`

    // ============================================================
    // TTS 생성 (실패한 것만 재생성)
    // ============================================================
    const ttsResults: Array<{
      id: string
      shotNumber: number
      audioUrl: string
      duration: number
    }> = []

    // 재생성이 필요한 shot 찾기
    const shotsToGenerate = existingTts
      ? shots.filter((shot) => {
          const existing = existingTts.find((t) => t.shotNumber === shot.shotNumber)
          return !existing?.audioUrl // audioUrl이 없거나 빈 문자열이면 재생성 필요
        })
      : shots

    logger.info('TTS generation plan', {
      totalShots: shots.length,
      shotsToGenerate: shotsToGenerate.length,
      existingTtsCount: existingTts?.length || 0,
      isRetry: !!existingTts,
    })

    // 기존 TTS 결과 먼저 추가 (재생성 아닌 것들)
    if (existingTts) {
      for (const existing of existingTts) {
        if (existing.audioUrl) {
          ttsResults.push({
            id: existing.id,
            shotNumber: existing.shotNumber,
            audioUrl: existing.audioUrl,
            duration: existing.duration,
          })
        }
      }
    }

    // 새로 생성이 필요한 TTS 처리 (개별 생성)
    for (const shot of shotsToGenerate) {
      logger.info('Generating TTS for shot', {
        shotNumber: shot.shotNumber,
        narrationLength: shot.narration.length,
      })

      const result = await generateTTS({
        text: shot.narration,
        voice: 'Lb7qkOn5hF8p7qfCDH8q',
        languageCode: 'ko',
        speed: 1,             // 기본 속도
        stability: 0.35,      // 낮춰서 생동감 있는 톤
        similarityBoost: 0.75, // 자연스러운 음성
        style: 0.6,           // 높여서 동화 구연 느낌
        model: ttsModel,
        userId: user.id,
        projectId,
        sessionId,
        routeOverrides: buildRouteOverrides('kids-animation', 'audio', 'tts'),
      })

      ttsResults.push({
        id: shot.id,
        shotNumber: shot.shotNumber,
        audioUrl: result.url || '',
        duration: estimateTTSDuration(shot.narration),
      })

      if (!result.url) {
        logger.warn('TTS generation failed for shot', {
          shotNumber: shot.shotNumber,
          error: result.error,
        })
      }
    }

    // shotNumber 순으로 정렬
    ttsResults.sort((a, b) => a.shotNumber - b.shotNumber)

    // ============================================================
    // BGM 생성 (기존 BGM이 있으면 스킵)
    // ============================================================
    let bgmTracks = existingBgm || []

    if (!existingBgm || existingBgm.length === 0) {
      const baseBgmPrompt = bgmDirection || bgmPrompt
      const finalBgmPrompt = `${baseBgmPrompt} ${durationHint}`

      logger.info('Starting BGM generation', {
        bgmPrompt: finalBgmPrompt.slice(0, 100) + '...',
        totalDurationSec,
        durationHint,
        usedBgmDirection: !!bgmDirection,
      })

      const bgmResult = await generateBGM({
        prompt: finalBgmPrompt,
        instrumental: true,
        model: bgmModel,
        style: 'children music, orchestral, cheerful, happy, playful, whimsical',
        userId: user.id,
        projectId,
        sessionId,
      })

      logger.info('BGM generation result', {
        success: bgmResult.success,
        trackCount: bgmResult.tracks.length,
        error: bgmResult.error,
      })

      if (!bgmResult.success) {
        logger.error('BGM generation failed', { error: bgmResult.error })
      }

      bgmTracks = bgmResult.tracks
    } else {
      logger.info('Using existing BGM', { trackCount: existingBgm.length })
    }

    // 결과 요약
    const failedTts = ttsResults.filter((t) => !t.audioUrl)
    if (failedTts.length > 0) {
      logger.warn('Some TTS generations failed', {
        failedCount: failedTts.length,
        failedShots: failedTts.map((t) => t.shotNumber),
      })
    }

    return {
      sessionId,
      tts: ttsResults,
      bgmTracks,
    }
  },
  { rateLimit: { maxRequests: 5, windowMs: 60_000 } }
)

// TTS + BGM 생성은 시간이 오래 걸림
export const maxDuration = 300
