/**
 * Image Generation Service
 *
 * Primary: Direct Gemini API (gemini-3-pro-image-preview)
 * Fallback: Kie.ai API (nano-banana-pro)
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import {
  generateImageFromText,
  generateImageFromReference,
  isGeminiImageAvailable,
  urlToBase64,
  urlsToBase64,
  GeminiImageError,
} from './gemini-image-client'
import type { GeminiAspectRatio, GeminiImageSize } from './gemini-image-client'
import { saveImage } from './image-storage'
import {
  createTask,
  waitForTask,
  isKieaiAvailable,
  KieaiError,
} from './kieai-client'
import type {
  ImageGenerateParams,
  ImageEditParams,
  ImageBatchEditParams,
  GenerationResult,
  BatchGenerationResult,
} from './types'

// Determine which provider to use
const USE_GEMINI = isGeminiImageAvailable()
const USE_KIEAI = !USE_GEMINI && isKieaiAvailable()
const IS_MOCK = !USE_GEMINI && !USE_KIEAI

// Log provider selection at module load
console.log('[image-service] Provider selection:', {
  USE_GEMINI,
  USE_KIEAI,
  IS_MOCK,
  GEMINI_KEY_EXISTS: !!process.env.GEMINI_API_KEY,
})

// ============================================================
// Text to Image
// ============================================================

export async function generateImage(
  params: ImageGenerateParams
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockGenerateImage(params)
  }

  if (USE_GEMINI) {
    return generateImageWithGemini(params)
  }

  return generateImageWithKieai(params)
}

async function generateImageWithGemini(
  params: ImageGenerateParams
): Promise<GenerationResult> {
  try {
    const result = await generateImageFromText({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio as GeminiAspectRatio,
      imageSize: (params.resolution || '1K') as GeminiImageSize,
    })

    if (!result.success || !result.base64) {
      return {
        success: false,
        error: result.error || 'Image generation failed',
      }
    }

    // Save base64 to file and get URL
    const saved = await saveImage({
      base64: result.base64,
      mimeType: result.mimeType,
      prefix: 'gen',
    })

    if (!saved.success) {
      return {
        success: false,
        error: saved.error || 'Failed to save image',
      }
    }

    return {
      success: true,
      url: saved.url,
      metadata: {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
        model: 'gemini-3-pro-image-preview',
        provider: 'gemini',
      },
    }
  } catch (error) {
    const message =
      error instanceof GeminiImageError ? error.message : 'Image generation failed'
    return {
      success: false,
      error: message,
    }
  }
}

async function generateImageWithKieai(
  params: ImageGenerateParams
): Promise<GenerationResult> {
  try {
    const taskId = await createTask(params.model || 'nano-banana', {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio || '16:9',
      resolution: params.resolution || '1K',
      output_format: 'png',
    })

    const result = await waitForTask(taskId, { maxWaitMs: 120000 })

    const url =
      result.resultJson?.url ||
      result.resultJson?.image_url ||
      (result.resultJson?.urls as string[])?.[0]

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
        model: params.model || 'nano-banana',
        provider: 'kieai',
      },
    }
  } catch (error) {
    const message =
      error instanceof KieaiError ? error.message : 'Image generation failed'
    return {
      success: false,
      error: message,
    }
  }
}

// Counter for unique mock seeds
let mockSeedCounter = 0

async function mockGenerateImage(
  params: ImageGenerateParams
): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Use counter + timestamp for unique seed
  const seed = `${Date.now()}-${mockSeedCounter++}`

  // Determine size based on aspect ratio
  const [w, h] = (params.aspectRatio || '16:9').split(':').map(Number)
  const baseSize = 512
  const width = w && h ? Math.round(baseSize * (w / Math.min(w, h))) : 800
  const height = w && h ? Math.round(baseSize * (h / Math.min(w, h))) : 450

  return {
    success: true,
    url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    metadata: {
      prompt: params.prompt,
      aspectRatio: params.aspectRatio || '16:9',
      model: 'mock',
      provider: 'mock',
    },
  }
}

// ============================================================
// Reference Image Edit
// ============================================================

export async function editImage(
  params: ImageEditParams
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockEditImage(params)
  }

  if (USE_GEMINI) {
    return editImageWithGemini(params)
  }

  return editImageWithKieai(params)
}

async function editImageWithGemini(
  params: ImageEditParams
): Promise<GenerationResult> {
  try {
    console.log('[image-service] editImageWithGemini referenceUrls:', params.referenceUrls)

    // Convert reference URLs to base64
    const referenceImages = await urlsToBase64(params.referenceUrls)
    console.log('[image-service] Converted to base64, count:', referenceImages.length)

    const result = await generateImageFromReference({
      prompt: params.prompt,
      referenceImages,
      aspectRatio: params.aspectRatio as GeminiAspectRatio,
      imageSize: (params.resolution || '1K') as GeminiImageSize,
    })

    if (!result.success || !result.base64) {
      return {
        success: false,
        error: result.error || 'Image edit failed',
      }
    }

    // Save base64 to file and get URL
    const saved = await saveImage({
      base64: result.base64,
      mimeType: result.mimeType,
      prefix: 'edit',
    })

    if (!saved.success) {
      return {
        success: false,
        error: saved.error || 'Failed to save image',
      }
    }

    return {
      success: true,
      url: saved.url,
      metadata: {
        prompt: params.prompt,
        referenceCount: params.referenceUrls.length,
        aspectRatio: params.aspectRatio || '16:9',
        model: 'gemini-3-pro-image-preview',
        provider: 'gemini',
      },
    }
  } catch (error) {
    console.error('[image-service] editImageWithGemini error:', error)
    const message =
      error instanceof GeminiImageError ? error.message : 'Image edit failed'
    return {
      success: false,
      error: message,
    }
  }
}

async function editImageWithKieai(
  params: ImageEditParams
): Promise<GenerationResult> {
  try {
    const taskId = await createTask(params.model || 'nano-banana-pro', {
      prompt: params.prompt,
      image_input: params.referenceUrls,
      aspect_ratio: params.aspectRatio || '16:9',
      resolution: params.resolution || '1K',
      output_format: 'png',
    })

    const result = await waitForTask(taskId, { maxWaitMs: 120000 })

    const url =
      result.resultJson?.url ||
      result.resultJson?.image_url ||
      (result.resultJson?.urls as string[])?.[0]

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt,
        referenceCount: params.referenceUrls.length,
        aspectRatio: params.aspectRatio || '16:9',
        provider: 'kieai',
      },
    }
  } catch (error) {
    const message =
      error instanceof KieaiError ? error.message : 'Image edit failed'
    return {
      success: false,
      error: message,
    }
  }
}

async function mockEditImage(
  params: ImageEditParams
): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Use counter + timestamp for unique seed
  const seed = `${Date.now()}-${mockSeedCounter++}`

  // Determine size based on aspect ratio
  const [w, h] = (params.aspectRatio || '16:9').split(':').map(Number)
  const baseSize = 512
  const width = w && h ? Math.round(baseSize * (w / Math.min(w, h))) : 800
  const height = w && h ? Math.round(baseSize * (h / Math.min(w, h))) : 450

  return {
    success: true,
    url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    metadata: {
      prompt: params.prompt,
      referenceCount: params.referenceUrls.length,
      aspectRatio: params.aspectRatio || '16:9',
      provider: 'mock',
    },
  }
}

// ============================================================
// Batch Image Edit
// ============================================================

export async function batchEditImages(
  params: ImageBatchEditParams,
  onProgress?: (current: number, total: number, result: GenerationResult) => void
): Promise<BatchGenerationResult> {
  if (IS_MOCK) {
    return mockBatchEditImages(params, onProgress)
  }

  const results: BatchGenerationResult['results'] = []
  const total = params.tasks.length

  // Process sequentially for better progress tracking
  for (let i = 0; i < total; i++) {
    const task = params.tasks[i]
    if (!task) continue

    const result = await editImage({
      prompt: task.prompt,
      referenceUrls: task.referenceUrls,
      aspectRatio: params.aspectRatio,
      model: params.model,
      resolution: params.resolution,
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

async function mockBatchEditImages(
  params: ImageBatchEditParams,
  onProgress?: (current: number, total: number, result: GenerationResult) => void
): Promise<BatchGenerationResult> {
  const results: BatchGenerationResult['results'] = []
  const total = params.tasks.length

  // Determine size based on aspect ratio
  const [w, h] = (params.aspectRatio || '16:9').split(':').map(Number)
  const baseSize = 512
  const width = w && h ? Math.round(baseSize * (w / Math.min(w, h))) : 800
  const height = w && h ? Math.round(baseSize * (h / Math.min(w, h))) : 450

  for (let i = 0; i < total; i++) {
    const task = params.tasks[i]
    if (!task) continue

    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Use counter + timestamp for unique seed
    const seed = `${Date.now()}-${mockSeedCounter++}`

    const result: GenerationResult = {
      success: true,
      url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
      metadata: {
        prompt: task.prompt,
        index: i,
        provider: 'mock',
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
// Utility
// ============================================================

export function isImageServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getImageServiceProvider(): 'gemini' | 'kieai' | 'mock' {
  if (USE_GEMINI) return 'gemini'
  if (USE_KIEAI) return 'kieai'
  return 'mock'
}

// Re-export urlToBase64 for external use
export { urlToBase64, urlsToBase64 }
