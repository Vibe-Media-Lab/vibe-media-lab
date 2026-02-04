import { createApiHandler } from '@/lib/api'
import { batchGenerateTTS, generateBGM, estimateTTSDuration } from '@/lib/services'
import type { TTSVoice } from '@/lib/services'
import {
  AudioRequestSchema,
  type AudioResponse,
} from '@/lib/api/kids-animation/types'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/kids-animation/audio')

/**
 * POST /api/kids-animation/audio
 *
 * 오디오 생성 (TTS + BGM)
 *
 * 서비스 연동:
 * - audioService.batchGenerateTTS() - 나레이션 배치 생성
 * - audioService.generateBGM() - BGM 생성
 */
export const POST = createApiHandler<AudioResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = AudioRequestSchema.parse(body)

    const { sessionId, shots, bgmPrompt } = validated

    // TTS 배치 태스크 준비 (동화책 읽어주는 톤)
    const ttsTasks = shots.map((shot) => ({
      text: shot.narration,
      voice: 'Rachel' as TTSVoice,
      speed: 0.9,           // 천천히 또박또박
      stability: 0.65,      // 일관된 톤 유지
      similarityBoost: 0.8, // 자연스러운 음성
      style: 0.35,          // 약간의 표현력 (동화책 느낌)
    }))

    // TTS 배치 생성 (userId 전달하면 자동으로 Library에 저장됨)
    const ttsResult = await batchGenerateTTS({
      tasks: ttsTasks,
      languageCode: 'ko',
      userId: user.id,
      sessionId,
    })

    // TTS 결과 매핑
    const tts = shots.map((shot, idx) => {
      const result = ttsResult.results[idx]
      return {
        id: shot.id,
        shotNumber: shot.shotNumber,
        audioUrl: result?.url || '',
        duration: estimateTTSDuration(shot.narration),
      }
    })

    // BGM 생성 (userId 전달하면 자동으로 Library에 저장됨)
    logger.info('Starting BGM generation', { bgmPrompt: bgmPrompt.slice(0, 50) })

    const bgmResult = await generateBGM({
      prompt: bgmPrompt,
      instrumental: true,
      userId: user.id,
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

    return {
      sessionId,
      tts,
      bgmTracks: bgmResult.tracks,
    }
  }
)
