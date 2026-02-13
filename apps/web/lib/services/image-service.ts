/**
 * Image Generation Service
 *
 * Router 기반 멀티 프로바이더 라우팅
 * - kieai: nano-banana-pro (text-to-image)
 * - fal.ai: nano-banana-pro/edit (image-to-image)
 * - gemini: Direct API (fallback)
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 * @see https://fal.ai/models/fal-ai/nano-banana-pro/edit/api
 */

import {
  generateImageFromText,
  generateImageFromReference,
  isGeminiImageAvailable,
  urlToBase64,
  urlsToBase64,
  GeminiImageError,
} from './gemini-image-client'
import {
  createTask,
  waitForTask,
  isKieaiAvailable,
  KieaiError,
  extractResultUrl,
} from './kieai-client'
import { falImageGenerate, falImageEdit, isFalAvailable, FalError } from './fal-client'
import { MODEL_CATALOG } from '@/lib/models/catalog'
import { IMAGE_GEN_MODELS, IMAGE_EDIT_MODELS } from '@/lib/constants/model-options'
import {
  routeModel,
  buildResultMeta,
  getManualFallback,
  resolveProvider,
  isProviderAvailable,
} from '@/lib/models/router'
import type { RouteResult } from '@/lib/models/router'
import { saveImage } from './image-storage'
import { saveToLibrary } from './library-saver'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
import * as Sentry from '@sentry/nextjs'
import { getLogger } from '@/lib/logger'
import type { GeminiAspectRatio, GeminiImageSize } from './gemini-image-client'
import type {
  ImageGenerateParams,
  ImageEditParams,
  ImageBatchEditParams,
  GenerationResult,
  BatchGenerationResult,
} from './types'

const logger = getLogger('image-service')

function isAnyImageProviderAvailable(): boolean {
  return isFalAvailable() || isKieaiAvailable() || isGeminiImageAvailable()
}

const IS_MOCK = !isAnyImageProviderAvailable()

logger.info('Image service initialized', {
  providers: {
    fal: isFalAvailable(),
    kieai: isKieaiAvailable(),
    gemini: isGeminiImageAvailable(),
  },
  mock: IS_MOCK,
})

// ============================================================
// Provider-specific: text-to-image
// ============================================================

async function generateImageViaKieai(
  params: ImageGenerateParams,
  model: string,
): Promise<GenerationResult> {
  try {
    const taskId = await createTask(model, {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio || '16:9',
      resolution: params.resolution || '1K',
      output_format: 'png',
    })

    const result = await waitForTask(taskId, { maxWaitMs: 120000 })

    const url = extractResultUrl(result.resultJson, `image-generate model=${model} taskId=${taskId}`)

    if (!url) {
      const error = `kieai image generation succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
      Sentry.withScope((scope) => {
        scope.setTag('service', 'image-generation')
        scope.setTag('provider', 'kieai')
        scope.setExtra('model', model)
        scope.setExtra('taskId', taskId)
        scope.setExtra('resultState', result.state)
        Sentry.captureException(new Error(error))
      })
      return { success: false, error }
    }

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
        model,
        provider: 'kieai',
      },
    }
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-generation')
      scope.setTag('provider', 'kieai')
      scope.setExtra('prompt', params.prompt?.slice(0, 200))
      scope.setExtra('model', model)
      Sentry.captureException(error)
    })
    const message =
      error instanceof KieaiError ? error.message : 'Image generation failed'
    return { success: false, error: message }
  }
}

async function generateImageWithGemini(
  params: ImageGenerateParams,
  model?: string,
): Promise<GenerationResult> {
  try {
    const geminiModel = model?.startsWith('gemini-') ? model : undefined
    const result = await generateImageFromText({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio as GeminiAspectRatio,
      imageSize: (params.resolution || '1K') as GeminiImageSize,
      model: geminiModel,
    })

    if (!result.success || !result.base64) {
      return { success: false, error: result.error || 'Image generation failed' }
    }

    const saved = await saveImage({
      base64: result.base64,
      mimeType: result.mimeType,
      prefix: 'gen',
    })

    if (!saved.success) {
      return { success: false, error: saved.error || 'Failed to save image' }
    }

    return {
      success: true,
      url: saved.url,
      metadata: {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
        model: geminiModel || 'gemini-3-pro-image-preview',
        provider: 'gemini',
      },
    }
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-generation')
      scope.setTag('provider', 'gemini')
      scope.setExtra('prompt', params.prompt?.slice(0, 200))
      scope.setExtra('model', model)
      Sentry.captureException(error)
    })
    const message =
      error instanceof GeminiImageError ? error.message : 'Image generation failed'
    return { success: false, error: message }
  }
}

async function generateImageViaFal(
  params: ImageGenerateParams,
  model: string,
): Promise<GenerationResult> {
  try {
    const result = await falImageGenerate({
      modelId: model,
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
    })

    // fal 임시 URL → fetch → buffer → saveImage
    const response = await fetchWithTimeout(result.url, { timeoutMs: 45000 })
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/png'
    const saved = await saveImage({
      base64: buffer.toString('base64'),
      mimeType: contentType,
      prefix: 'gen',
    })

    if (!saved.success) {
      return { success: false, error: saved.error || 'Failed to save image' }
    }

    return {
      success: true,
      url: saved.url,
      metadata: {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
        model,
        provider: 'fal',
      },
    }
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-generation')
      scope.setTag('provider', 'fal')
      scope.setExtra('prompt', params.prompt?.slice(0, 200))
      scope.setExtra('model', model)
      Sentry.captureException(error)
    })
    const message =
      error instanceof FalError ? error.message : 'Image generation failed'
    return { success: false, error: message }
  }
}

// ============================================================
// Provider-specific: image-to-image
// ============================================================

async function editImageViaFal(
  params: ImageEditParams,
  model: string,
): Promise<GenerationResult> {
  try {
    const result = await falImageEdit({
      modelId: model,
      prompt: params.prompt,
      imageUrls: params.referenceUrls,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
    })

    // fal 임시 URL → fetch → base64 → saveImage
    const response = await fetchWithTimeout(result.url, { timeoutMs: 45000 })
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/png'
    const saved = await saveImage({
      base64: buffer.toString('base64'),
      mimeType: contentType,
      prefix: 'edit',
    })

    if (!saved.success) {
      return { success: false, error: saved.error || 'Failed to save image' }
    }

    return {
      success: true,
      url: saved.url,
      metadata: {
        prompt: params.prompt,
        referenceCount: params.referenceUrls.length,
        aspectRatio: params.aspectRatio || '16:9',
        model,
        provider: 'fal',
      },
    }
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-edit')
      scope.setTag('provider', 'fal')
      scope.setExtra('prompt', params.prompt?.slice(0, 200))
      scope.setExtra('model', model)
      scope.setExtra('referenceCount', params.referenceUrls.length)
      Sentry.captureException(error)
    })
    const message =
      error instanceof FalError ? error.message : 'Image edit failed'
    return { success: false, error: message }
  }
}

async function editImageWithGemini(
  params: ImageEditParams,
  model?: string,
): Promise<GenerationResult> {
  try {
    // Gemini 모델별 maxRefImages 제한 적용
    const geminiModelId = model?.startsWith('gemini-') ? model : 'gemini-3-pro-image-preview'
    const catalog = MODEL_CATALOG.find(m => m.id === geminiModelId)
    const maxRefs = catalog?.constraints?.maxRefImages
    const refUrls = maxRefs && params.referenceUrls.length > maxRefs
      ? params.referenceUrls.slice(0, maxRefs)
      : params.referenceUrls

    logger.debug('Starting image edit with Gemini', {
      referenceCount: refUrls.length,
      originalCount: params.referenceUrls.length,
      maxRefs,
    })

    const referenceImages = await urlsToBase64(refUrls)

    const geminiModel = model?.startsWith('gemini-') ? model : undefined
    const result = await generateImageFromReference({
      prompt: params.prompt,
      referenceImages,
      aspectRatio: params.aspectRatio as GeminiAspectRatio,
      imageSize: (params.resolution || '1K') as GeminiImageSize,
      model: geminiModel,
    })

    if (!result.success || !result.base64) {
      return { success: false, error: result.error || 'Image edit failed' }
    }

    const saved = await saveImage({
      base64: result.base64,
      mimeType: result.mimeType,
      prefix: 'edit',
    })

    if (!saved.success) {
      return { success: false, error: saved.error || 'Failed to save image' }
    }

    return {
      success: true,
      url: saved.url,
      metadata: {
        prompt: params.prompt,
        referenceCount: params.referenceUrls.length,
        aspectRatio: params.aspectRatio || '16:9',
        model: geminiModel || 'gemini-3-pro-image-preview',
        provider: 'gemini',
      },
    }
  } catch (error) {
    const details = error instanceof GeminiImageError ? error.details : undefined
    logger.error('Image edit with Gemini failed', {
      error: error instanceof Error ? error.message : String(error),
      details,
    })
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-edit')
      scope.setTag('provider', 'gemini')
      scope.setExtra('prompt', params.prompt?.slice(0, 200))
      scope.setExtra('model', model)
      scope.setExtra('referenceCount', params.referenceUrls.length)
      if (details) scope.setExtra('geminiDiagnostics', details)
      Sentry.captureException(error)
    })
    const message =
      error instanceof GeminiImageError ? error.message : 'Image edit failed'
    return {
      success: false,
      error: message,
      metadata: details ? { geminiDiagnostics: details } : undefined,
    }
  }
}

async function editImageWithKieai(
  params: ImageEditParams,
  model: string,
): Promise<GenerationResult> {
  try {
    const taskId = await createTask(model, {
      prompt: params.prompt,
      image_input: params.referenceUrls,
      aspect_ratio: params.aspectRatio || '16:9',
      resolution: params.resolution || '1K',
      output_format: 'png',
    })

    const result = await waitForTask(taskId, { maxWaitMs: 120000 })

    const url = extractResultUrl(result.resultJson, `image-edit model=${model} taskId=${taskId}`)

    if (!url) {
      const error = `kieai image edit succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
      Sentry.withScope((scope) => {
        scope.setTag('service', 'image-edit')
        scope.setTag('provider', 'kieai')
        scope.setExtra('model', model)
        scope.setExtra('taskId', taskId)
        scope.setExtra('resultState', result.state)
        Sentry.captureException(new Error(error))
      })
      return { success: false, error }
    }

    return {
      success: true,
      url,
      taskId,
      metadata: {
        prompt: params.prompt,
        referenceCount: params.referenceUrls.length,
        aspectRatio: params.aspectRatio || '16:9',
        model,
        provider: 'kieai',
      },
    }
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-edit')
      scope.setTag('provider', 'kieai')
      scope.setExtra('prompt', params.prompt?.slice(0, 200))
      scope.setExtra('referenceCount', params.referenceUrls.length)
      Sentry.captureException(error)
    })
    const message =
      error instanceof KieaiError ? error.message : 'Image edit failed'
    return { success: false, error: message }
  }
}

// ============================================================
// Dispatch Functions
// ============================================================

function dispatchImageGeneration(
  params: ImageGenerateParams,
  route: RouteResult,
): Promise<GenerationResult> {
  switch (route.provider) {
    case 'fal': return generateImageViaFal(params, route.modelId)
    case 'kieai': return generateImageViaKieai(params, route.modelId)
    case 'gemini': return generateImageWithGemini(params, route.modelId)
    default: throw new Error(`text-to-image: unsupported provider ${route.provider}`)
  }
}

function dispatchImageEdit(
  params: ImageEditParams,
  route: RouteResult,
): Promise<GenerationResult> {
  switch (route.provider) {
    case 'fal': return editImageViaFal(params, route.modelId)
    case 'gemini': return editImageWithGemini(params, route.modelId)
    case 'kieai': return editImageWithKieai(params, route.modelId)
    default: throw new Error(`image-to-image: unsupported provider ${route.provider}`)
  }
}

// ============================================================
// Text to Image — Router 기반
// ============================================================

export async function generateImage(
  params: ImageGenerateParams,
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockGenerateImage(params)
  }

  const requestedModel = params.model || IMAGE_GEN_MODELS.defaultModelId
  const route = routeModel(requestedModel, 'text-to-image', params.routeOverrides)
  const startTime = Date.now()

  if (!route) {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['provider-unavailable', 'text-to-image'])
      scope.setTag('service', 'image-generation')
      scope.setLevel('error')
      Sentry.captureMessage('All image generation providers unavailable', {
        extra: { requestedModel },
      })
    })
    return { success: false, error: '사용 가능한 이미지 생성 서비스가 없습니다.' }
  }

  // 1차 시도
  let result: GenerationResult
  try {
    result = await dispatchImageGeneration(params, route)
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-generation')
      scope.setTag('provider', route.provider)
      scope.setTag('phase', 'dispatch-safety-net')
      scope.setExtra('modelId', route.modelId)
      Sentry.captureException(error)
    })
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Image generation failed',
    }
  }

  if (result.success) {
    result.metadata = { ...result.metadata, ...buildResultMeta(requestedModel, route, startTime) }
    return saveAndReturn(result, params, 'image')
  }

  // fallback
  const fallbackId = getManualFallback(route.modelId, 'text-to-image', params.routeOverrides)
  if (fallbackId) {
    const fbProvider = resolveProvider(fallbackId)
    if (isProviderAvailable(fbProvider)) {
      logger.info('Image generation falling back', { fallbackId, fbProvider, originalError: result.error })
      const fbRoute: RouteResult = { modelId: fallbackId, provider: fbProvider, fallbackUsed: true }
      try {
        const fbResult = await dispatchImageGeneration(params, fbRoute)
        fbResult.metadata = { ...fbResult.metadata, ...buildResultMeta(requestedModel, fbRoute, startTime) }
        return saveAndReturn(fbResult, params, 'image')
      } catch (fbError) {
        Sentry.withScope((scope) => {
          scope.setTag('service', 'image-generation')
          scope.setTag('provider', fbRoute.provider)
          scope.setTag('phase', 'fallback-safety-net')
          scope.setExtra('modelId', fbRoute.modelId)
          scope.setExtra('originalError', result.error)
          Sentry.captureException(fbError)
        })
      }
    }
  }

  result.metadata = { ...result.metadata, ...buildResultMeta(requestedModel, route, startTime) }
  return result
}

// ============================================================
// Reference Image Edit — Router 기반
// ============================================================

export async function editImage(
  params: ImageEditParams,
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockEditImage(params)
  }

  const requestedModel = params.model || IMAGE_EDIT_MODELS.defaultModelId
  const route = routeModel(requestedModel, 'image-to-image', params.routeOverrides)
  const startTime = Date.now()

  if (!route) {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['provider-unavailable', 'image-to-image'])
      scope.setTag('service', 'image-edit')
      scope.setLevel('error')
      Sentry.captureMessage('All image edit providers unavailable', {
        extra: { requestedModel },
      })
    })
    return { success: false, error: '사용 가능한 이미지 편집 서비스가 없습니다.' }
  }

  // 1차 시도
  let result: GenerationResult
  try {
    result = await dispatchImageEdit(params, route)
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'image-edit')
      scope.setTag('provider', route.provider)
      scope.setTag('phase', 'dispatch-safety-net')
      scope.setExtra('modelId', route.modelId)
      Sentry.captureException(error)
    })
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Image edit failed',
    }
  }

  if (result.success) {
    result.metadata = { ...result.metadata, ...buildResultMeta(requestedModel, route, startTime) }
    return saveAndReturn(result, params, 'image')
  }

  // fallback
  const fallbackId = getManualFallback(route.modelId, 'image-to-image', params.routeOverrides)
  if (fallbackId) {
    const fbProvider = resolveProvider(fallbackId)
    if (isProviderAvailable(fbProvider)) {
      logger.info('Image edit falling back', { fallbackId, fbProvider, originalError: result.error })
      const fbRoute: RouteResult = { modelId: fallbackId, provider: fbProvider, fallbackUsed: true }
      try {
        const fbResult = await dispatchImageEdit(params, fbRoute)
        fbResult.metadata = { ...fbResult.metadata, ...buildResultMeta(requestedModel, fbRoute, startTime) }
        return saveAndReturn(fbResult, params, 'image')
      } catch (fbError) {
        Sentry.withScope((scope) => {
          scope.setTag('service', 'image-edit')
          scope.setTag('provider', fbRoute.provider)
          scope.setTag('phase', 'fallback-safety-net')
          scope.setExtra('modelId', fbRoute.modelId)
          scope.setExtra('originalError', result.error)
          Sentry.captureException(fbError)
        })
      }
    }
  }

  result.metadata = { ...result.metadata, ...buildResultMeta(requestedModel, route, startTime) }
  return result
}

// ============================================================
// Batch Image Edit
// ============================================================

export async function batchEditImages(
  params: ImageBatchEditParams,
  onProgress?: (current: number, total: number, result: GenerationResult) => void,
): Promise<BatchGenerationResult> {
  if (IS_MOCK) {
    return mockBatchEditImages(params, onProgress)
  }

  const total = params.tasks.length

  const settled = await Promise.allSettled(
    params.tasks.map((task, i) =>
      editImage({
        prompt: task.prompt,
        referenceUrls: task.referenceUrls,
        aspectRatio: params.aspectRatio,
        model: params.model,
        resolution: params.resolution,
        routeOverrides: params.routeOverrides,
        userId: params.userId,
        projectId: params.projectId,
        sessionId: params.sessionId,
        metadata: { ...params.metadata, batchIndex: i },
      }).then((result) => {
        onProgress?.(i + 1, total, result)
        return { index: i, result }
      }),
    ),
  )

  const results: BatchGenerationResult['results'] = settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      return {
        index: s.value.index,
        success: s.value.result.success,
        url: s.value.result.url,
        error: s.value.result.error,
      }
    }
    return {
      index: i,
      success: false,
      url: undefined,
      error: String(s.reason),
    }
  })

  return {
    success: results.every((r) => r.success),
    results,
    totalSuccess: results.filter((r) => r.success).length,
    totalFailed: results.filter((r) => !r.success).length,
  }
}

// ============================================================
// Library Auto-Save
// ============================================================

async function saveAndReturn(
  result: GenerationResult,
  params: { userId?: string; projectId?: string; sessionId?: string; prompt: string; aspectRatio?: string; resolution?: string; metadata?: Record<string, unknown> },
  mediaType: 'image',
): Promise<GenerationResult> {
  if (!result.success || !result.url || !params.userId) return result

  const saveResult = await saveToLibrary({
    userId: params.userId,
    projectId: params.projectId,
    mediaType,
    prompt: params.prompt,
    outputUrl: result.url,
    provider: (result.metadata?.actualProvider ?? result.metadata?.provider ?? 'unknown') as string,
    model: (result.metadata?.actualModel ?? result.metadata?.model ?? 'unknown') as string,
    config: {
      sessionId: params.sessionId,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      ...params.metadata,
    },
  })

  if (saveResult.success && saveResult.id) {
    return { ...result, dbId: saveResult.id }
  }
  return result
}

// ============================================================
// Mock
// ============================================================

let mockSeedCounter = 0

async function mockGenerateImage(
  params: ImageGenerateParams,
): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  const seed = `${Date.now()}-${mockSeedCounter++}`
  const [w, h] = (params.aspectRatio || '16:9').split(':').map(Number)
  const baseSize = 512
  const width = w && h ? Math.round(baseSize * (w / Math.min(w, h))) : 800
  const height = w && h ? Math.round(baseSize * (h / Math.min(w, h))) : 450

  return {
    success: true,
    url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    metadata: { prompt: params.prompt, aspectRatio: params.aspectRatio || '16:9', model: 'mock', provider: 'mock' },
  }
}

async function mockEditImage(
  params: ImageEditParams,
): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const seed = `${Date.now()}-${mockSeedCounter++}`
  const [w, h] = (params.aspectRatio || '16:9').split(':').map(Number)
  const baseSize = 512
  const width = w && h ? Math.round(baseSize * (w / Math.min(w, h))) : 800
  const height = w && h ? Math.round(baseSize * (h / Math.min(w, h))) : 450

  return {
    success: true,
    url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    metadata: { prompt: params.prompt, referenceCount: params.referenceUrls.length, aspectRatio: params.aspectRatio || '16:9', provider: 'mock' },
  }
}

async function mockBatchEditImages(
  params: ImageBatchEditParams,
  onProgress?: (current: number, total: number, result: GenerationResult) => void,
): Promise<BatchGenerationResult> {
  const results: BatchGenerationResult['results'] = []
  const total = params.tasks.length
  const [w, h] = (params.aspectRatio || '16:9').split(':').map(Number)
  const baseSize = 512
  const width = w && h ? Math.round(baseSize * (w / Math.min(w, h))) : 800
  const height = w && h ? Math.round(baseSize * (h / Math.min(w, h))) : 450

  for (let i = 0; i < total; i++) {
    const task = params.tasks[i]
    if (!task) continue
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const seed = `${Date.now()}-${mockSeedCounter++}`
    const result: GenerationResult = {
      success: true,
      url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
      metadata: { prompt: task.prompt, index: i, provider: 'mock' },
    }
    results.push({ index: i, success: true, url: result.url })
    onProgress?.(i + 1, total, result)
  }

  return { success: true, results, totalSuccess: results.length, totalFailed: 0 }
}

// ============================================================
// Utility
// ============================================================

export function isImageServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getImageServiceProvider(): 'gemini' | 'kieai' | 'fal' | 'mock' {
  if (isFalAvailable()) return 'fal'
  if (isKieaiAvailable()) return 'kieai'
  if (isGeminiImageAvailable()) return 'gemini'
  return 'mock'
}

export { urlToBase64, urlsToBase64 }
