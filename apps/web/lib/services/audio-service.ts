/**
 * Audio Generation Service
 *
 * ElevenLabs TTS + Suno BGM via Kie.ai
 * @see https://docs.kie.ai/market/elevenlabs/text-to-speech-multilingual-v2
 * @see https://docs.kie.ai/suno-api/generate-music
 */

import {
  createTask,
  waitForTask,
  createMusicTask,
  waitForMusic,
  isKieaiAvailable,
  KieaiError,
} from './kieai-client'
import { getLogger } from '@/lib/logger'

const logger = getLogger('audio-service')
import { saveToLibrary } from './library-saver'
import { uploadMedia } from './supabase-storage'
import type {
  TTSParams,
  TTSBatchParams,
  BGMParams,
  GenerationResult,
  BatchGenerationResult,
  BGMTrack,
  BGMGenerationResult,
} from './types'

const IS_MOCK = !isKieaiAvailable()

// ============================================================
// Text to Speech (ElevenLabs)
// ============================================================

const TTS_MAX_RETRIES = 3
const TTS_RETRY_DELAY_MS = 2000

export async function generateTTS(params: TTSParams): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockGenerateTTS(params)
  }

  let lastError: string = 'TTS generation failed'

  for (let attempt = 1; attempt <= TTS_MAX_RETRIES; attempt++) {
    try {
      const result = await generateTTSInternal(params)

      // URL이 없으면 실패로 간주하고 재시도
      if (!result.url) {
        logger.warn('TTS generation returned no URL', {
          attempt,
          maxRetries: TTS_MAX_RETRIES,
          text: params.text.slice(0, 30) + '...',
        })
        lastError = 'TTS generation returned no URL'

        if (attempt < TTS_MAX_RETRIES) {
          await sleep(TTS_RETRY_DELAY_MS * attempt) // 점진적 백오프
          continue
        }
      }

      if (attempt > 1) {
        logger.info('TTS generation succeeded after retry', { attempt })
      }

      return result
    } catch (error) {
      lastError = error instanceof KieaiError ? error.message : 'TTS generation failed'

      logger.warn('TTS generation attempt failed', {
        attempt,
        maxRetries: TTS_MAX_RETRIES,
        error: lastError,
      })

      if (attempt < TTS_MAX_RETRIES) {
        await sleep(TTS_RETRY_DELAY_MS * attempt) // 점진적 백오프
      }
    }
  }

  logger.error('TTS generation failed after all retries', {
    maxRetries: TTS_MAX_RETRIES,
    error: lastError,
  })

  return {
    success: false,
    error: lastError,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generateTTSInternal(params: TTSParams): Promise<GenerationResult> {
  const taskId = await createTask(
    'elevenlabs/text-to-speech-multilingual-v2',
    {
      text: params.text,
      voice: params.voice || 'Rachel',
      language_code: params.languageCode || 'ko',
      speed: params.speed ?? 1,
      stability: params.stability ?? 0.5,
      similarity_boost: params.similarityBoost ?? 0.75,
      style: params.style ?? 0,
    }
  )

  const result = await waitForTask(taskId, { maxWaitMs: 120000 })

  // resultJson이 문자열일 수 있음 - 파싱 필요
  let parsedResult = result.resultJson
  if (typeof result.resultJson === 'string') {
    try {
      parsedResult = JSON.parse(result.resultJson)
    } catch {
      parsedResult = {}
    }
  }

  const url =
    parsedResult?.url ||
    parsedResult?.audio_url ||
    (parsedResult?.urls as string[])?.[0] ||
    (parsedResult?.resultUrls as string[])?.[0]

  const duration = estimateTTSDuration(params.text)

  // 자동 Library 저장 (userId가 있을 때만)
  if (url && params.userId) {
    await saveToLibrary({
      userId: params.userId,
      mediaType: 'tts',
      prompt: params.text,
      outputUrl: url,
      provider: 'kieai',
      model: 'elevenlabs',
      durationSeconds: duration,
      config: {
        sessionId: params.sessionId,
        voice: params.voice || 'Rachel',
        languageCode: params.languageCode || 'ko',
        ...params.metadata,
      },
    })
  }

  return {
    success: true,
    url,
    taskId,
    metadata: {
      text: params.text.slice(0, 50) + (params.text.length > 50 ? '...' : ''),
      voice: params.voice || 'Rachel',
      languageCode: params.languageCode || 'ko',
      estimatedDuration: duration,
    },
  }
}

async function mockGenerateTTS(params: TTSParams): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock placeholder audio URL for testing
  const mockAudioUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${Math.floor(Math.random() * 16) + 1}.mp3`

  return {
    success: true,
    url: mockAudioUrl,
    metadata: {
      text: params.text.slice(0, 50) + (params.text.length > 50 ? '...' : ''),
      voice: params.voice || 'Rachel',
      languageCode: params.languageCode || 'ko',
      estimatedDuration: estimateTTSDuration(params.text),
      mock: true,
    },
  }
}

// ============================================================
// Batch TTS
// ============================================================

export async function batchGenerateTTS(
  params: TTSBatchParams,
  onProgress?: (current: number, total: number, result: GenerationResult) => void
): Promise<BatchGenerationResult> {
  if (IS_MOCK) {
    return mockBatchGenerateTTS(params, onProgress)
  }

  const results: BatchGenerationResult['results'] = []
  const total = params.tasks.length

  // Process sequentially for better error handling
  for (let i = 0; i < total; i++) {
    const task = params.tasks[i]
    if (!task) continue

    // userId와 sessionId를 각 generateTTS 호출에 전달
    const result = await generateTTS({
      text: task.text,
      voice: task.voice,
      languageCode: params.languageCode,
      speed: task.speed,
      stability: task.stability,
      similarityBoost: task.similarityBoost,
      style: task.style,
      userId: params.userId,
      sessionId: params.sessionId,
      metadata: { ...params.metadata, batchIndex: i },
    })

    results.push({
      index: i,
      success: result.success,
      url: result.url,
      error: result.error,
    })

    onProgress?.(i + 1, total, result)
  }

  return {
    success: results.every((r) => r.success),
    results,
    totalSuccess: results.filter((r) => r.success).length,
    totalFailed: results.filter((r) => !r.success).length,
  }
}

async function mockBatchGenerateTTS(
  params: TTSBatchParams,
  onProgress?: (current: number, total: number, result: GenerationResult) => void
): Promise<BatchGenerationResult> {
  const results: BatchGenerationResult['results'] = []
  const total = params.tasks.length

  for (let i = 0; i < total; i++) {
    const task = params.tasks[i]
    if (!task) continue

    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock placeholder audio URL for testing
    const mockAudioUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 16) + 1}.mp3`

    const result: GenerationResult = {
      success: true,
      url: mockAudioUrl,
      metadata: {
        text: task.text.slice(0, 30) + '...',
        voice: task.voice || 'Rachel',
        estimatedDuration: estimateTTSDuration(task.text),
        mock: true,
      },
    }

    results.push({
      index: i,
      success: true,
      url: mockAudioUrl,
    })

    onProgress?.(i + 1, total, result)
  }

  return {
    success: true,
    results,
    totalSuccess: results.length,
    totalFailed: 0,
  }
}

// ============================================================
// BGM Generation (Suno)
// ============================================================

/**
 * Download audio from URL for storage upload
 * This is called immediately after BGM generation when URL is still valid
 */
async function downloadAudioForStorage(url: string): Promise<Buffer | null> {
  try {
    logger.debug('Downloading BGM for storage', { url: url.slice(0, 50) + '...' })

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*,*/*',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      logger.warn('BGM download failed', { status: response.status })
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length < 1000) {
      logger.warn('BGM download returned too small data', { size: buffer.length })
      return null
    }

    logger.debug('BGM downloaded for storage', {
      size: buffer.length,
      sizeKB: Math.round(buffer.length / 1024),
    })

    return buffer
  } catch (error) {
    logger.warn('BGM download error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

export async function generateBGM(params: BGMParams): Promise<BGMGenerationResult> {
  if (IS_MOCK) {
    logger.info('Using mock BGM generation')
    return mockGenerateBGM(params)
  }

  try {
    logger.info('Creating BGM task', {
      prompt: params.prompt.slice(0, 50),
      model: params.model || 'V4_5',
    })

    const taskId = await createMusicTask({
      prompt: params.prompt,
      instrumental: params.instrumental ?? true,
      model: params.model || 'V4_5',
      style: params.style,
      title: params.title,
      customMode: true,
    })

    logger.info('BGM task created', { taskId })

    const result = await waitForMusic(taskId, {
      maxWaitMs: 300000,
      pollIntervalMs: 5000,
      onProgress: (state) => {
        logger.debug('BGM task progress', { taskId, state })
      },
    })

    // Handle both new format (response.sunoData) and legacy format (data)
    const sunoData = result.response?.sunoData
    const legacyData = result.data

    logger.info('BGM task completed', {
      taskId,
      state: result.state,
      hasSunoData: !!sunoData?.length,
      hasLegacyData: !!legacyData?.length,
    })

    // Extract all valid tracks (Suno returns 2 tracks per request)
    const tracks: BGMTrack[] = []

    if (sunoData) {
      for (const track of sunoData) {
        const url = track.audioUrl || track.streamAudioUrl
        if (url) {
          tracks.push({
            id: track.id,
            url,
            duration: track.duration || 90,
            title: track.title,
            imageUrl: track.imageUrl,
          })
        }
      }
    }

    // Fallback to legacy format
    if (tracks.length === 0 && legacyData) {
      for (const track of legacyData) {
        if (track.audio_url) {
          tracks.push({
            id: track.id,
            url: track.audio_url,
            duration: track.duration || 90,
            title: track.title,
          })
        }
      }
    }

    logger.info('BGM tracks extracted', { trackCount: tracks.length })

    // userId가 있으면 Supabase Storage에 업로드하여 영구 URL 확보
    if (tracks.length > 0 && params.userId) {
      for (const track of tracks) {
        try {
          // kie.ai URL에서 오디오 다운로드
          const audioBuffer = await downloadAudioForStorage(track.url)

          if (audioBuffer) {
            // Supabase Storage에 업로드
            const uploadResult = await uploadMedia({
              file: audioBuffer,
              userId: params.userId,
              mediaType: 'audio',
              contentType: 'audio/mp3',
            })

            if (uploadResult.success && uploadResult.url) {
              logger.info('BGM uploaded to Supabase Storage', {
                trackId: track.id,
                originalUrl: track.url.slice(0, 50) + '...',
                permanentUrl: uploadResult.url.slice(0, 50) + '...',
              })
              // 영구 URL로 교체
              track.url = uploadResult.url
            }
          }
        } catch (uploadError) {
          // 업로드 실패해도 원본 URL 유지
          logger.warn('Failed to upload BGM to storage, keeping original URL', {
            trackId: track.id,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          })
        }

        // Library에 저장 (영구 URL 또는 원본 URL)
        await saveToLibrary({
          userId: params.userId,
          mediaType: 'bgm',
          prompt: params.prompt,
          outputUrl: track.url,
          provider: 'kieai',
          model: params.model || 'suno-V4_5',
          durationSeconds: track.duration,
          config: {
            sessionId: params.sessionId,
            instrumental: params.instrumental ?? true,
            title: track.title,
            trackId: track.id,
            ...params.metadata,
          },
        })
      }
    }

    return {
      success: tracks.length > 0,
      tracks,
      taskId,
      error: tracks.length === 0 ? 'No valid BGM tracks generated' : undefined,
    }
  } catch (error) {
    const message =
      error instanceof KieaiError ? error.message : 'BGM generation failed'

    logger.error('BGM generation error', {
      error: message,
      errorType: error instanceof KieaiError ? 'KieaiError' : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      success: false,
      tracks: [],
      error: message,
    }
  }
}

async function mockGenerateBGM(params: BGMParams): Promise<BGMGenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Mock placeholder BGM URLs for testing (royalty-free music)
  return {
    success: true,
    tracks: [
      {
        id: 'mock-bgm-1',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        duration: 90,
        title: 'Mock BGM Track 1',
      },
      {
        id: 'mock-bgm-2',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        duration: 95,
        title: 'Mock BGM Track 2',
      },
    ],
  }
}

// ============================================================
// Utility
// ============================================================

export function isAudioServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getAudioServiceProvider(): 'kieai' | 'mock' {
  if (process.env.KIEAI_API_KEY) return 'kieai'
  return 'mock'
}

/**
 * Estimate TTS duration from text (seconds)
 */
export function estimateTTSDuration(text: string): number {
  // Korean: ~3-4 characters per second
  return Math.ceil(text.length / 3.5)
}

/**
 * Estimate TTS generation time (API processing, seconds)
 */
export function estimateTTSGenerationTime(taskCount: number): number {
  // Batch processing: ~5-10 seconds per batch of 7
  return Math.ceil(taskCount / 7) * 8
}
