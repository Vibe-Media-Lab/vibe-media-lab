/**
 * Video Generation Service
 *
 * Kling AI API (Image-to-Video, Text-to-Video)
 * @see https://docs.kie.ai/market/kling/image-to-video
 */

import {
  createTask,
  waitForTask,
  isKieaiAvailable,
  KieaiError,
} from './kieai-client'
import type {
  ImageToVideoParams,
  TextToVideoParams,
  GenerationResult,
} from './types'
import { getLogger } from '@/lib/logger'

const logger = getLogger('video-service')
const IS_MOCK = !isKieaiAvailable()

// ============================================================
// Image to Video
// ============================================================

export async function imageToVideo(
  params: ImageToVideoParams
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockImageToVideo(params)
  }

  const startTime = Date.now()
  logger.info('Starting image-to-video generation', {
    imageUrl: params.imageUrl.slice(0, 50) + '...',
    duration: params.duration || '5',
  })

  try {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      image_urls: [params.imageUrl],
      duration: params.duration || '5',
      aspect_ratio: params.aspectRatio || '16:9',
      sound: params.sound ?? false,
    }

    if (params.tailImageUrl) {
      input.image_urls = [params.imageUrl, params.tailImageUrl]
    }

    const taskId = await createTask('kling-2.6/image-to-video', input)
    logger.info('Task created', { taskId })

    // Video generation takes longer (2-5 minutes)
    const result = await waitForTask(taskId, {
      maxWaitMs: 600000,
      pollIntervalMs: 10000,
    })

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
      parsedResult?.video_url ||
      (parsedResult?.urls as string[])?.[0] ||
      (parsedResult?.resultUrls as string[])?.[0]

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.info('Video generation completed', {
      taskId,
      hasUrl: !!url,
      elapsedSec,
    })

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt,
        duration: params.duration || '5',
        model: 'kling-2.6/image-to-video',
        sourceImage: params.imageUrl,
      },
    }
  } catch (error) {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    const message =
      error instanceof KieaiError ? error.message : 'Video generation failed'

    logger.error('Video generation failed', {
      error: message,
      errorType: error instanceof KieaiError ? 'KieaiError' : 'Unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
      imageUrl: params.imageUrl.slice(0, 50) + '...',
      elapsedSec,
    })

    return {
      success: false,
      error: message,
    }
  }
}

async function mockImageToVideo(
  params: ImageToVideoParams
): Promise<GenerationResult> {
  const duration = params.duration === '10' ? 4000 : 3000
  await new Promise((resolve) => setTimeout(resolve, duration))

  return {
    success: true,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    metadata: {
      prompt: params.prompt,
      duration: params.duration || '5',
      model: 'kling-2.6/image-to-video',
      sourceImage: params.imageUrl,
      mock: true,
    },
  }
}

// ============================================================
// Text to Video
// ============================================================

export async function textToVideo(
  params: TextToVideoParams
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockTextToVideo(params)
  }

  try {
    const taskId = await createTask('kling-2.6/text-to-video', {
      prompt: params.prompt,
      duration: params.duration || '5',
      aspect_ratio: params.aspectRatio || '16:9',
      sound: params.sound ?? false,
    })

    const result = await waitForTask(taskId, {
      maxWaitMs: 600000,
      pollIntervalMs: 10000,
    })

    const url =
      result.resultJson?.url ||
      result.resultJson?.video_url ||
      (result.resultJson?.urls as string[])?.[0]

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt,
        duration: params.duration || '5',
        aspectRatio: params.aspectRatio || '16:9',
        model: 'kling-2.6/text-to-video',
      },
    }
  } catch (error) {
    const message =
      error instanceof KieaiError ? error.message : 'Video generation failed'
    return {
      success: false,
      error: message,
    }
  }
}

async function mockTextToVideo(
  params: TextToVideoParams
): Promise<GenerationResult> {
  const duration = params.duration === '10' ? 5000 : 3500
  await new Promise((resolve) => setTimeout(resolve, duration))

  return {
    success: true,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    metadata: {
      prompt: params.prompt,
      duration: params.duration || '5',
      aspectRatio: params.aspectRatio || '16:9',
      model: 'kling-2.6/text-to-video',
      mock: true,
    },
  }
}

// ============================================================
// Sequential Video Generation
// ============================================================

/**
 * Generate videos sequentially
 *
 * Kling batch API has image mapping issues, so we use sequential calls
 */
export async function generateVideosSequentially(
  tasks: Array<{
    imageUrl: string
    prompt: string
    duration?: '5' | '10'
  }>,
  onProgress?: (current: number, total: number, result: GenerationResult) => void
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = []
  const total = tasks.length
  const startTime = Date.now()

  logger.info('Starting sequential video generation', { total })

  for (let i = 0; i < total; i++) {
    const task = tasks[i]
    if (!task) continue

    logger.info(`Processing video ${i + 1}/${total}`, {
      shotIndex: i,
      prompt: task.prompt.slice(0, 50) + '...',
      duration: task.duration,
    })

    const result = await imageToVideo({
      imageUrl: task.imageUrl,
      prompt: task.prompt,
      duration: task.duration,
    })

    results.push(result)

    if (!result.success) {
      logger.warn(`Video ${i + 1}/${total} failed`, {
        shotIndex: i,
        error: result.error,
      })
    } else {
      logger.info(`Video ${i + 1}/${total} completed`, {
        shotIndex: i,
        hasUrl: !!result.url,
      })
    }

    onProgress?.(i + 1, total, result)
  }

  const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1)
  const successCount = results.filter((r) => r.success && r.url).length
  const failedCount = total - successCount

  logger.info('Sequential video generation completed', {
    total,
    successCount,
    failedCount,
    elapsedMin,
  })

  if (failedCount > 0) {
    logger.warn('Some videos failed to generate', {
      failedIndices: results
        .map((r, i) => (!r.success || !r.url ? i : -1))
        .filter((i) => i >= 0),
    })
  }

  return results
}

// ============================================================
// Utility
// ============================================================

export function isVideoServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getVideoServiceProvider(): 'kieai' | 'mock' {
  if (process.env.KIEAI_API_KEY) return 'kieai'
  return 'mock'
}

/**
 * Estimate video generation time (seconds)
 */
export function estimateVideoGenerationTime(
  shotCount: number,
  duration: '5' | '10'
): number {
  // Average: 3 minutes per shot
  const perShot = duration === '10' ? 240 : 180
  return shotCount * perShot
}
