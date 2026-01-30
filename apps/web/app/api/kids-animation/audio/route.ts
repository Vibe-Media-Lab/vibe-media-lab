import { createApiHandler } from '@/lib/api'
import { batchGenerateTTS, generateBGM, estimateTTSDuration } from '@/lib/services'
import type { TTSVoice } from '@/lib/services'
import {
  AudioRequestSchema,
  type AudioResponse,
} from '@/lib/api/kids-animation/types'

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
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = AudioRequestSchema.parse(body)

    const { sessionId, shots, bgmPrompt } = validated

    // TTS 배치 태스크 준비
    const ttsTasks = shots.map((shot) => ({
      text: shot.narration,
      voice: 'Rachel' as TTSVoice,
    }))

    // TTS 배치 생성
    const ttsResult = await batchGenerateTTS({
      tasks: ttsTasks,
      languageCode: 'ko',
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

    // BGM 생성
    const bgmResult = await generateBGM({
      prompt: bgmPrompt,
      instrumental: true,
    })

    const totalTTSDuration = tts.reduce((sum, t) => sum + t.duration, 0)

    return {
      sessionId,
      tts,
      bgm: {
        url: bgmResult.url || '',
        duration: totalTTSDuration + 10, // TTS 총 길이 + 여유
      },
    }
  }
)
