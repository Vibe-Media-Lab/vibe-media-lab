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
import type {
  TTSParams,
  TTSBatchParams,
  BGMParams,
  GenerationResult,
  BatchGenerationResult,
} from './types'

const IS_MOCK = !isKieaiAvailable()

// ============================================================
// Text to Speech (ElevenLabs)
// ============================================================

export async function generateTTS(params: TTSParams): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockGenerateTTS(params)
  }

  try {
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

    const url =
      result.resultJson?.url ||
      result.resultJson?.audio_url ||
      (result.resultJson?.urls as string[])?.[0]

    return {
      success: true,
      url,
      taskId,
      metadata: {
        text: params.text.slice(0, 50) + (params.text.length > 50 ? '...' : ''),
        voice: params.voice || 'Rachel',
        languageCode: params.languageCode || 'ko',
        estimatedDuration: estimateTTSDuration(params.text),
      },
    }
  } catch (error) {
    const message =
      error instanceof KieaiError ? error.message : 'TTS generation failed'
    return {
      success: false,
      error: message,
    }
  }
}

async function mockGenerateTTS(params: TTSParams): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    success: true,
    url: '',
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

    const result = await generateTTS({
      text: task.text,
      voice: task.voice,
      languageCode: params.languageCode,
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

    const result: GenerationResult = {
      success: true,
      url: '',
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
      url: result.url,
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

export async function generateBGM(params: BGMParams): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockGenerateBGM(params)
  }

  try {
    const taskId = await createMusicTask({
      prompt: params.prompt,
      instrumental: params.instrumental ?? true,
      model: params.model || 'V4_5',
      style: params.style,
      title: params.title,
      customMode: true,
    })

    const result = await waitForMusic(taskId, {
      maxWaitMs: 300000,
      pollIntervalMs: 5000,
    })

    const firstTrack = result.data?.[0]
    const url = firstTrack?.audio_url

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt.slice(0, 50) + '...',
        instrumental: params.instrumental ?? true,
        model: params.model || 'V4_5',
        duration: firstTrack?.duration || 90,
        title: firstTrack?.title,
      },
    }
  } catch (error) {
    const message =
      error instanceof KieaiError ? error.message : 'BGM generation failed'
    return {
      success: false,
      error: message,
    }
  }
}

async function mockGenerateBGM(params: BGMParams): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 3000))

  return {
    success: true,
    url: '',
    metadata: {
      prompt: params.prompt.slice(0, 50) + '...',
      instrumental: params.instrumental ?? true,
      model: params.model || 'V4_5',
      estimatedDuration: 90,
      mock: true,
    },
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
