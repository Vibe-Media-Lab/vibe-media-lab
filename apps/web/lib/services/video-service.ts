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

  try {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      image_urls: [params.imageUrl],
      duration: params.duration || '5',
      sound: params.sound ?? false,
    }

    if (params.tailImageUrl) {
      input.image_urls = [params.imageUrl, params.tailImageUrl]
    }

    const taskId = await createTask('kling-2.6/image-to-video', input)

    // Video generation takes longer (2-5 minutes)
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
        model: 'kling-2.6/image-to-video',
        sourceImage: params.imageUrl,
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

async function mockImageToVideo(
  params: ImageToVideoParams
): Promise<GenerationResult> {
  const duration = params.duration === '10' ? 4000 : 3000
  await new Promise((resolve) => setTimeout(resolve, duration))

  return {
    success: true,
    url: '', // No mock video URL
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
    url: '', // No mock video URL
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

  for (let i = 0; i < total; i++) {
    const task = tasks[i]
    if (!task) continue

    const result = await imageToVideo({
      imageUrl: task.imageUrl,
      prompt: task.prompt,
      duration: task.duration,
    })

    results.push(result)
    onProgress?.(i + 1, total, result)
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
