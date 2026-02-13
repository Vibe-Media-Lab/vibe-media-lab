/**
 * Audio Generation Service
 *
 * Router 기반 멀티 프로바이더 라우팅
 * - fal.ai: ElevenLabs TTS (multilingual-v2, turbo-v2.5)
 * - kieai: ElevenLabs TTS + Suno BGM
 *
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
  extractResultUrl,
} from './kieai-client'
import { falTextToSpeech, isFalAvailable } from './fal-client'
import { TTS_MODELS } from '@/lib/constants/model-options'
import {
  routeModel,
  buildResultMeta,
  getManualFallback,
  resolveProvider,
  isProviderAvailable,
} from '@/lib/models/router'
import type { RouteResult } from '@/lib/models/router'
import * as Sentry from '@sentry/nextjs'
import { getLogger } from '@/lib/logger'
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

const logger = getLogger('audio-service')

// fal 또는 kieai 중 하나라도 있으면 실제 서비스
const IS_MOCK = !isFalAvailable() && !isKieaiAvailable()

// ============================================================
// Text to Speech — Router 기반
// ============================================================

export async function generateTTS(params: TTSParams): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockGenerateTTS(params)
  }

  try {
    return await generateTTSInternal(params)
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'tts-generation')
      scope.setExtra('textLength', params.text.length)
      scope.setExtra('model', params.model)
      Sentry.captureException(error)
    })
    const message = error instanceof KieaiError ? error.message : 'TTS generation failed'
    logger.error('TTS generation failed', {
      error: message,
      text: params.text.slice(0, 30) + '...',
    })
    return {
      success: false,
      error: message,
    }
  }
}

/** provider 기반 동적 디스패치 — fallback에서도 올바른 구현체 호출 */
function dispatchTTSGeneration(
  params: TTSParams,
  route: RouteResult,
): Promise<GenerationResult> {
  return route.provider === 'fal'
    ? generateTTSViaFal(params, route)
    : generateTTSViaKieai(params, route)
}

async function generateTTSInternal(params: TTSParams): Promise<GenerationResult> {
  const requestedModel = params.model || TTS_MODELS.defaultModelId
  const route = routeModel(requestedModel, 'tts', params.routeOverrides)
  const startTime = Date.now()

  // 모든 provider 불가
  if (!route) {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['provider-unavailable', 'tts'])
      scope.setTag('service', 'tts-generation')
      scope.setLevel('error')
      Sentry.captureMessage('All TTS providers unavailable', {
        extra: { requestedModel },
      })
    })
    return { success: false, error: '사용 가능한 TTS 서비스가 없습니다.' }
  }

  // 1차 시도 — provider-aware dispatch
  let result: GenerationResult = await dispatchTTSGeneration(params, route)

  // 실패 시 fallback — route.modelId 기준, provider-aware dispatch
  if (!result.success) {
    const fallbackId = getManualFallback(route.modelId, 'tts', params.routeOverrides)
    if (fallbackId) {
      const fbProvider = resolveProvider(fallbackId)
      if (isProviderAvailable(fbProvider)) {
        logger.info('TTS falling back', { fallbackId, fbProvider, originalError: result.error })
        const fbRoute: RouteResult = { modelId: fallbackId, provider: fbProvider, fallbackUsed: true }
        const fbResult = await dispatchTTSGeneration(params, fbRoute)
        fbResult.metadata = {
          ...fbResult.metadata,
          ...buildResultMeta(requestedModel, fbRoute, startTime),
        }
        return fbResult
      }
    }
  }

  // ResultMeta 병합
  result.metadata = {
    ...result.metadata,
    ...buildResultMeta(requestedModel, route, startTime),
  }
  return result
}

// ============================================================
// TTS Provider Implementations
// ============================================================

async function generateTTSViaFal(
  params: TTSParams,
  route: RouteResult,
): Promise<GenerationResult> {
  try {
    const result = await falTextToSpeech({
      text: params.text,
      voice: params.voice || 'Rachel',
      model: route.modelId,
      languageCode: params.languageCode || 'ko',
      speed: params.speed,
      stability: params.stability,
      similarityBoost: params.similarityBoost,
      style: params.style,
    })

    // fal URL 만료 방지 — Supabase Storage에 재업로드
    let permanentUrl = result.url
    if (params.userId) {
      const audioBuffer = await downloadAudioForStorage(result.url)
      if (audioBuffer) {
        const uploadResult = await uploadMedia({
          file: audioBuffer,
          userId: params.userId,
          mediaType: 'audio',
          contentType: 'audio/mp3',
        })
        if (uploadResult.success && uploadResult.url) {
          permanentUrl = uploadResult.url
        }
      }
    }

    const duration = estimateTTSDuration(params.text)

    // Library 저장
    if (permanentUrl && params.userId) {
      await saveToLibrary({
        userId: params.userId,
        projectId: params.projectId,
        mediaType: 'tts',
        prompt: params.text,
        outputUrl: permanentUrl,
        provider: route.provider,
        model: route.modelId,
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
      url: permanentUrl,
      metadata: {
        text: params.text.slice(0, 50) + (params.text.length > 50 ? '...' : ''),
        voice: params.voice || 'Rachel',
        languageCode: params.languageCode || 'ko',
        estimatedDuration: duration,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fal TTS generation failed'
    Sentry.withScope((scope) => {
      scope.setTag('service', 'tts-generation')
      scope.setTag('provider', 'fal')
      scope.setExtra('model', route.modelId)
      scope.setExtra('textLength', params.text.length)
      Sentry.captureException(error)
    })
    logger.error('fal TTS generation failed', { error: message })
    return { success: false, error: message }
  }
}

async function generateTTSViaKieai(
  params: TTSParams,
  route: RouteResult,
): Promise<GenerationResult> {
  const taskId = await createTask(
    route.modelId,
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

  const url = extractResultUrl(result.resultJson, `tts model=${route.modelId} taskId=${taskId}`)

  if (!url) {
    const error = `kieai TTS succeeded but returned no URL (model: ${route.modelId}, taskId: ${taskId})`
    Sentry.withScope((scope) => {
      scope.setTag('service', 'tts-generation')
      scope.setTag('provider', 'kieai')
      scope.setExtra('model', route.modelId)
      scope.setExtra('taskId', taskId)
      scope.setExtra('resultState', result.state)
      Sentry.captureException(new Error(error))
    })
    return { success: false, error, taskId }
  }

  const duration = estimateTTSDuration(params.text)

  // Library 저장 (route 기반 동적 값)
  if (url && params.userId) {
    await saveToLibrary({
      userId: params.userId,
      projectId: params.projectId,
      mediaType: 'tts',
      prompt: params.text,
      outputUrl: url,
      provider: route.provider,
      model: route.modelId,
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

  for (let i = 0; i < total; i++) {
    const task = params.tasks[i]
    if (!task) continue

    const result = await generateTTS({
      text: task.text,
      voice: task.voice,
      languageCode: params.languageCode,
      speed: task.speed,
      stability: task.stability,
      similarityBoost: task.similarityBoost,
      style: task.style,
      userId: params.userId,
      projectId: params.projectId,
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
// BGM Generation (Suno — kieai 전용)
// ============================================================

/**
 * Download audio from URL for storage upload
 */
async function downloadAudioForStorage(url: string): Promise<Buffer | null> {
  try {
    logger.debug('Downloading audio for storage', { url: url.slice(0, 50) + '...' })

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*,*/*',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      logger.warn('Audio download failed', { status: response.status })
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length < 1000) {
      logger.warn('Audio download returned too small data', { size: buffer.length })
      return null
    }

    logger.debug('Audio downloaded for storage', {
      size: buffer.length,
      sizeKB: Math.round(buffer.length / 1024),
    })

    return buffer
  } catch (error) {
    logger.warn('Audio download error', {
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

  // BGM은 현재 kieai 전용 — kieai 없으면 mock
  if (!isKieaiAvailable()) {
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

    const sunoData = result.response?.sunoData
    const legacyData = result.data

    logger.info('BGM task completed', {
      taskId,
      state: result.state,
      hasSunoData: !!sunoData?.length,
      hasLegacyData: !!legacyData?.length,
    })

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

    // Supabase Storage 업로드 + Library 저장
    if (tracks.length > 0 && params.userId) {
      for (const track of tracks) {
        try {
          const audioBuffer = await downloadAudioForStorage(track.url)

          if (audioBuffer) {
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
              track.url = uploadResult.url
            }
          }
        } catch (uploadError) {
          logger.warn('Failed to upload BGM to storage, keeping original URL', {
            trackId: track.id,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          })
        }

        // BGM은 현재 kieai 전용
        await saveToLibrary({
          userId: params.userId,
          projectId: params.projectId,
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

    Sentry.withScope((scope) => {
      scope.setTag('service', 'bgm-generation')
      scope.setTag('provider', 'kieai')
      scope.setExtra('model', params.model || 'V4_5')
      Sentry.captureException(error)
    })

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

async function mockGenerateBGM(_params: BGMParams): Promise<BGMGenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 3000))

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

export function getAudioServiceProvider(): 'fal' | 'kieai' | 'mock' {
  if (isFalAvailable()) return 'fal'
  if (isKieaiAvailable()) return 'kieai'
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
