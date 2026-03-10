/**
 * Video Generation Service
 *
 * Router 기반 멀티 프로바이더 라우팅 + VideoTransport 기반 디스패치
 *
 * API types:
 * - kieai-standard: Kling, Sora2, Seedance, Hailuo, Wan, Grok
 * - kieai-veo: Veo3, Veo3 Fast
 * - kieai-runway: Runway
 * - fal: Kling Pro, Kling 3.0, Hailuo, Veo3, Luma
 */

import {
  createTask,
  waitForTask,
  isKieaiAvailable,
  KieaiError,
  buildKieaiVideoInput,
  createVeoTask,
  waitForVeoTask,
  createRunwayTask,
  waitForRunwayTask,
  extractResultUrl,
} from './kieai-client'
import { falImageToVideo, falTextToVideo, isFalAvailable, FalError } from './fal-client'
import { VIDEO_MODELS } from '@/lib/constants/model-options'
import { getVideoTransport } from './video-transport'
import type { VideoTransport } from './video-transport'
import {
  routeModel,
  buildResultMeta,
  getManualFallback,
  resolveProvider,
  isProviderAvailable,
} from '@/lib/models/router'
import type { RouteResult } from '@/lib/models/router'
import type {
  ImageToVideoParams,
  TextToVideoParams,
  GenerationResult,
} from './types'
import * as Sentry from '@sentry/nextjs'
import { getLogger } from '@/lib/logger'

const logger = getLogger('video-service')
const IS_MOCK = !isFalAvailable() && !isKieaiAvailable()

/** API 에러 메시지 → 사용자 친화적 메시지 */
function toUserMessage(raw: string): string {
  if (raw.toLowerCase().includes('credits insufficient') || raw.toLowerCase().includes('balance')) {
    return '크레딧이 부족합니다. 계정에서 크레딧을 충전해주세요.'
  }
  if (raw.toLowerCase().includes('timeout')) {
    return '비디오 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
  }
  if (raw.toLowerCase().includes('rate limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }
  if (raw.toLowerCase().includes('veo') || raw.toLowerCase().includes('runway')) {
    return '비디오 생성에 실패했습니다. 다른 모델로 다시 시도해주세요.'
  }
  return raw
}

// ============================================================
// Image to Video — Router + VideoTransport 기반
// ============================================================

/** VideoTransport.apiType 기반 동적 디스패치 */
function dispatchVideoGeneration(
  params: ImageToVideoParams,
  route: RouteResult,
  transport: VideoTransport,
): Promise<GenerationResult> {
  switch (transport.apiType) {
    case 'kieai-standard':
      return imageToVideoViaKieaiStandard(params, route.modelId, transport.family)
    case 'kieai-veo':
      return imageToVideoViaVeo(params, route.modelId)
    case 'kieai-runway':
      return imageToVideoViaRunway(params, route.modelId)
    case 'fal':
      return imageToVideoViaFal(params, route.modelId)
  }
}

/** T2V 디스패치 */
function dispatchTextToVideoGeneration(
  params: TextToVideoParams,
  route: RouteResult,
  transport: VideoTransport,
): Promise<GenerationResult> {
  switch (transport.apiType) {
    case 'kieai-standard':
      return textToVideoViaKieaiStandard(params, route.modelId, transport.family)
    case 'kieai-veo':
      return textToVideoViaVeo(params, route.modelId)
    case 'kieai-runway':
      return textToVideoViaRunway(params, route.modelId)
    case 'fal':
      return textToVideoViaFal(params, route.modelId)
  }
}

export async function imageToVideo(
  params: ImageToVideoParams,
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockImageToVideo(params)
  }

  const requestedModel = params.model || VIDEO_MODELS.defaultModelId
  const route = routeModel(requestedModel, 'image-to-video', params.routeOverrides)
  const startTime = Date.now()

  if (!route) {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['provider-unavailable', 'image-to-video'])
      scope.setTag('service', 'video-generation')
      scope.setLevel('error')
      Sentry.captureMessage('All video providers unavailable', {
        extra: { requestedModel },
      })
    })
    return { success: false, error: '사용 가능한 비디오 생성 서비스가 없습니다.' }
  }

  let transport: VideoTransport
  try {
    transport = getVideoTransport(route.modelId)
  } catch {
    return { success: false, error: `지원하지 않는 비디오 모델입니다: ${route.modelId}` }
  }

  // 1차 시도
  let result: GenerationResult
  try {
    result = await dispatchVideoGeneration(params, route, transport)
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'video-generation')
      scope.setTag('provider', route.provider)
      scope.setTag('phase', 'dispatch-safety-net')
      scope.setExtra('modelId', route.modelId)
      Sentry.captureException(error)
    })
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Video generation failed',
    }
  }

  if (result.success) {
    result.metadata = {
      ...result.metadata,
      ...buildResultMeta(requestedModel, route, startTime),
    }
    return result
  }

  // Fallback
  const fallbackId = getManualFallback(route.modelId, 'image-to-video', params.routeOverrides)
  if (fallbackId) {
    const fbProvider = resolveProvider(fallbackId)
    if (isProviderAvailable(fbProvider)) {
      logger.info('Video falling back', { fallbackId, fbProvider, originalError: result.error })
      const fbRoute: RouteResult = { modelId: fallbackId, provider: fbProvider, fallbackUsed: true }
      try {
        const fbTransport = getVideoTransport(fallbackId)
        const fbResult = await dispatchVideoGeneration(params, fbRoute, fbTransport)
        fbResult.metadata = {
          ...fbResult.metadata,
          ...buildResultMeta(requestedModel, fbRoute, startTime),
        }
        return fbResult
      } catch (fbError) {
        Sentry.withScope((scope) => {
          scope.setTag('service', 'video-generation')
          scope.setTag('provider', fbRoute.provider)
          scope.setTag('phase', 'fallback-safety-net')
          scope.setExtra('modelId', fbRoute.modelId)
          scope.setExtra('originalError', result.error)
          Sentry.captureException(fbError)
        })
      }
    }
  }

  result.metadata = {
    ...result.metadata,
    ...buildResultMeta(requestedModel, route, startTime),
  }
  return result
}

// ============================================================
// Text to Video — Router 기반
// ============================================================

export async function textToVideo(
  params: TextToVideoParams,
): Promise<GenerationResult> {
  if (IS_MOCK) {
    return mockTextToVideo(params)
  }

  // T2V config lazy import to avoid circular dependency at module scope
  let defaultModelId: string
  try {
    const { TEXT_TO_VIDEO_MODELS } = await import('@/lib/constants/model-options')
    defaultModelId = TEXT_TO_VIDEO_MODELS.defaultModelId
  } catch {
    defaultModelId = 'kling-2.6/text-to-video'
  }

  const requestedModel = params.model || defaultModelId
  const route = routeModel(requestedModel, 'text-to-video', params.routeOverrides)
  const startTime = Date.now()

  if (!route) {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['provider-unavailable', 'text-to-video'])
      scope.setTag('service', 'video-generation')
      scope.setLevel('error')
      Sentry.captureMessage('All text-to-video providers unavailable', {
        extra: { requestedModel },
      })
    })
    return { success: false, error: '사용 가능한 텍스트→비디오 서비스가 없습니다.' }
  }

  let transport: VideoTransport
  try {
    transport = getVideoTransport(route.modelId)
  } catch {
    return { success: false, error: `지원하지 않는 비디오 모델입니다: ${route.modelId}` }
  }

  let result: GenerationResult
  try {
    result = await dispatchTextToVideoGeneration(params, route, transport)
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'video-generation')
      scope.setTag('provider', route.provider)
      scope.setTag('phase', 't2v-dispatch-safety-net')
      scope.setExtra('modelId', route.modelId)
      Sentry.captureException(error)
    })
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Text-to-video generation failed',
    }
  }

  if (result.success) {
    result.metadata = {
      ...result.metadata,
      ...buildResultMeta(requestedModel, route, startTime),
    }
    return result
  }

  // Fallback
  const fallbackId = getManualFallback(route.modelId, 'text-to-video', params.routeOverrides)
  if (fallbackId) {
    const fbProvider = resolveProvider(fallbackId)
    if (isProviderAvailable(fbProvider)) {
      logger.info('T2V falling back', { fallbackId, fbProvider, originalError: result.error })
      const fbRoute: RouteResult = { modelId: fallbackId, provider: fbProvider, fallbackUsed: true }
      try {
        const fbTransport = getVideoTransport(fallbackId)
        const fbResult = await dispatchTextToVideoGeneration(params, fbRoute, fbTransport)
        fbResult.metadata = {
          ...fbResult.metadata,
          ...buildResultMeta(requestedModel, fbRoute, startTime),
        }
        return fbResult
      } catch (fbError) {
        Sentry.withScope((scope) => {
          scope.setTag('service', 'video-generation')
          scope.setTag('provider', fbRoute.provider)
          scope.setTag('phase', 't2v-fallback-safety-net')
          scope.setExtra('modelId', fbRoute.modelId)
          Sentry.captureException(fbError)
        })
      }
    }
  }

  result.metadata = {
    ...result.metadata,
    ...buildResultMeta(requestedModel, route, startTime),
  }
  return result
}

// ============================================================
// Provider-specific: kieai Standard
// ============================================================

async function imageToVideoViaKieaiStandard(
  params: ImageToVideoParams,
  model: string,
  family: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting I2V via kieai-standard', { model, family })

  try {
    const input = buildKieaiVideoInput(family, {
      prompt: params.prompt,
      imageUrl: params.imageUrl,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      sound: params.sound,
      resolution: params.resolution,
      tailImageUrl: params.tailImageUrl,
    })

    const taskId = await createTask(model, input)
    logger.info('kieai task created', { taskId, model })

    const result = await waitForTask(taskId, {
      maxWaitMs: 600000,
      pollIntervalMs: 10000,
    })

    return extractKieaiResult(result, params, model, startTime, taskId)
  } catch (error) {
    return handleKieaiError(error, model, startTime)
  }
}

async function textToVideoViaKieaiStandard(
  params: TextToVideoParams,
  model: string,
  family: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting T2V via kieai-standard', { model, family })

  try {
    const input = buildKieaiVideoInput(family, {
      prompt: params.prompt,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      sound: params.sound,
      resolution: params.resolution,
    })

    const taskId = await createTask(model, input)
    const result = await waitForTask(taskId, {
      maxWaitMs: 600000,
      pollIntervalMs: 10000,
    })

    return extractKieaiResult(result, params, model, startTime, taskId)
  } catch (error) {
    return handleKieaiError(error, model, startTime)
  }
}

// ============================================================
// Provider-specific: kieai Veo
// ============================================================

async function imageToVideoViaVeo(
  params: ImageToVideoParams,
  model: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting I2V via kieai-veo', { model })

  try {
    const veoParams: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      duration: params.duration || '8',
    }
    if (params.imageUrl) veoParams.image_url = params.imageUrl
    if (params.resolution) veoParams.resolution = params.resolution

    const taskId = await createVeoTask(veoParams)
    const result = await waitForVeoTask(taskId, { maxWaitMs: 600000, pollIntervalMs: 5000 })

    if (!result.videoUrl) {
      const error = `kieai veo video generation succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
      Sentry.withScope((scope) => {
        scope.setTag('service', 'video-generation')
        scope.setTag('provider', 'kieai')
        scope.setExtra('model', model)
        scope.setExtra('taskId', taskId)
        scope.setExtra('apiType', 'veo')
        Sentry.captureException(new Error(error))
      })
      return { success: false, error, taskId }
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    return {
      success: true,
      url: result.videoUrl,
      taskId,
      metadata: { model, provider: 'kieai', apiType: 'veo', elapsedSec },
    }
  } catch (error) {
    return handleKieaiError(error, model, startTime)
  }
}

async function textToVideoViaVeo(
  params: TextToVideoParams,
  model: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting T2V via kieai-veo', { model })

  try {
    const veoParams: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      duration: params.duration || '8',
    }
    if (params.resolution) veoParams.resolution = params.resolution

    const taskId = await createVeoTask(veoParams)
    const result = await waitForVeoTask(taskId, { maxWaitMs: 600000, pollIntervalMs: 5000 })

    if (!result.videoUrl) {
      const error = `kieai veo text-to-video succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
      Sentry.withScope((scope) => {
        scope.setTag('service', 'video-generation')
        scope.setTag('provider', 'kieai')
        scope.setExtra('model', model)
        scope.setExtra('taskId', taskId)
        scope.setExtra('apiType', 'veo')
        Sentry.captureException(new Error(error))
      })
      return { success: false, error, taskId }
    }

    return {
      success: true,
      url: result.videoUrl,
      taskId,
      metadata: { model, provider: 'kieai', apiType: 'veo' },
    }
  } catch (error) {
    return handleKieaiError(error, model, startTime)
  }
}

// ============================================================
// Provider-specific: kieai Runway
// ============================================================

async function imageToVideoViaRunway(
  params: ImageToVideoParams,
  model: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting I2V via kieai-runway', { model })

  try {
    const runwayParams: Record<string, unknown> = {
      prompt: params.prompt,
      duration: params.duration || '10',
    }
    if (params.imageUrl) runwayParams.image_url = params.imageUrl

    const taskId = await createRunwayTask(runwayParams)
    const result = await waitForRunwayTask(taskId, { maxWaitMs: 600000, pollIntervalMs: 5000 })

    const videoUrl = result.videoInfo?.videoUrl
    if (!videoUrl) {
      const error = `kieai runway video generation succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
      Sentry.withScope((scope) => {
        scope.setTag('service', 'video-generation')
        scope.setTag('provider', 'kieai')
        scope.setExtra('model', model)
        scope.setExtra('taskId', taskId)
        scope.setExtra('apiType', 'runway')
        Sentry.captureException(new Error(error))
      })
      return { success: false, error, taskId }
    }

    return {
      success: true,
      url: videoUrl,
      taskId,
      metadata: { model, provider: 'kieai', apiType: 'runway' },
    }
  } catch (error) {
    return handleKieaiError(error, model, startTime)
  }
}

async function textToVideoViaRunway(
  params: TextToVideoParams,
  model: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting T2V via kieai-runway', { model })

  try {
    const runwayParams: Record<string, unknown> = {
      prompt: params.prompt,
      duration: params.duration || '10',
    }

    const taskId = await createRunwayTask(runwayParams)
    const result = await waitForRunwayTask(taskId, { maxWaitMs: 600000, pollIntervalMs: 5000 })

    const videoUrl = result.videoInfo?.videoUrl
    if (!videoUrl) {
      const error = `kieai runway text-to-video succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
      Sentry.withScope((scope) => {
        scope.setTag('service', 'video-generation')
        scope.setTag('provider', 'kieai')
        scope.setExtra('model', model)
        scope.setExtra('taskId', taskId)
        scope.setExtra('apiType', 'runway')
        Sentry.captureException(new Error(error))
      })
      return { success: false, error, taskId }
    }

    return {
      success: true,
      url: videoUrl,
      taskId,
      metadata: { model, provider: 'kieai', apiType: 'runway' },
    }
  } catch (error) {
    return handleKieaiError(error, model, startTime)
  }
}

// ============================================================
// Provider-specific: fal.ai
// ============================================================

async function imageToVideoViaFal(
  params: ImageToVideoParams,
  model: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting I2V via fal.ai', { model })

  try {
    const result = await falImageToVideo(model, {
      imageUrl: params.imageUrl,
      prompt: params.prompt,
      duration: params.duration,
      tailImageUrl: params.tailImageUrl,
      sound: params.sound,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
    })

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    return {
      success: true,
      url: result.url,
      metadata: { model, provider: 'fal', elapsedSec },
    }
  } catch (error) {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    const rawMessage = error instanceof FalError ? error.message : 'Video generation failed'

    Sentry.withScope((scope) => {
      scope.setTag('service', 'video-generation')
      scope.setTag('provider', 'fal')
      scope.setExtra('model', model)
      scope.setExtra('elapsedSec', elapsedSec)
      Sentry.captureException(error)
    })

    return { success: false, error: toUserMessage(rawMessage) }
  }
}

async function textToVideoViaFal(
  params: TextToVideoParams,
  model: string,
): Promise<GenerationResult> {
  const startTime = Date.now()
  logger.info('Starting T2V via fal.ai', { model })

  try {
    const result = await falTextToVideo(model, {
      prompt: params.prompt,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      sound: params.sound,
    })

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    return {
      success: true,
      url: result.url,
      metadata: { model, provider: 'fal', elapsedSec },
    }
  } catch (error) {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    const rawMessage = error instanceof FalError ? error.message : 'Text-to-video failed'

    Sentry.withScope((scope) => {
      scope.setTag('service', 'video-generation')
      scope.setTag('provider', 'fal')
      scope.setExtra('model', model)
      scope.setExtra('elapsedSec', elapsedSec)
      Sentry.captureException(error)
    })

    return { success: false, error: toUserMessage(rawMessage) }
  }
}

// ============================================================
// Shared Helpers
// ============================================================

function extractKieaiResult(
  result: { state: string; resultJson?: import('./kieai-client').KieaiTaskResult['resultJson'] },
  params: { prompt: string; duration?: string },
  model: string,
  startTime: number,
  taskId: string,
): GenerationResult {
  const url = extractResultUrl(result.resultJson, `video model=${model} taskId=${taskId}`)

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('kieai video result', { taskId, state: result.state, hasUrl: !!url, elapsedSec })

  if (!url) {
    const error = `kieai video generation succeeded but returned no URL (model: ${model}, taskId: ${taskId})`
    Sentry.withScope((scope) => {
      scope.setTag('service', 'video-generation')
      scope.setTag('provider', 'kieai')
      scope.setExtra('model', model)
      scope.setExtra('taskId', taskId)
      scope.setExtra('resultState', result.state)
      Sentry.captureException(new Error(error))
    })
    return { success: false, error, taskId }
  }

  return {
    success: true,
    url,
    taskId,
    metadata: { model, provider: 'kieai', elapsedSec },
  }
}

function handleKieaiError(
  error: unknown,
  model: string,
  startTime: number,
): GenerationResult {
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
  const rawMessage = error instanceof KieaiError ? error.message : 'Video generation failed'

  Sentry.withScope((scope) => {
    scope.setTag('service', 'video-generation')
    scope.setTag('provider', 'kieai')
    scope.setExtra('model', model)
    scope.setExtra('elapsedSec', elapsedSec)
    Sentry.captureException(error)
  })

  logger.error('kieai video failed', { error: rawMessage, model, elapsedSec })
  return { success: false, error: toUserMessage(rawMessage) }
}

// ============================================================
// Mock
// ============================================================

async function mockImageToVideo(_params: ImageToVideoParams): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 3000))
  return {
    success: true,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    metadata: { mock: true, model: VIDEO_MODELS.defaultModelId },
  }
}

async function mockTextToVideo(_params: TextToVideoParams): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 3500))
  return {
    success: true,
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    metadata: { mock: true, model: 'kling-2.6/text-to-video' },
  }
}

// ============================================================
// Sequential Video Generation (기존 유지)
// ============================================================

export async function generateVideosSequentially(
  tasks: Array<{
    imageUrl: string
    prompt: string
    duration?: string
  }>,
  onProgress?: (current: number, total: number, result: GenerationResult) => void,
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = []
  const total = tasks.length
  const startTime = Date.now()

  logger.info('Starting sequential video generation', { total })

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

  const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1)
  const successCount = results.filter((r) => r.success && r.url).length

  logger.info('Sequential video generation completed', {
    total,
    successCount,
    failedCount: total - successCount,
    elapsedMin,
  })

  return results
}

// ============================================================
// Utility
// ============================================================

export function isVideoServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getVideoServiceProvider(): 'fal' | 'kieai' | 'mock' {
  if (isFalAvailable()) return 'fal'
  if (isKieaiAvailable()) return 'kieai'
  return 'mock'
}

export function estimateVideoGenerationTime(
  shotCount: number,
  duration: string,
): number {
  const perShot = duration === '10' ? 240 : 180
  return shotCount * perShot
}
