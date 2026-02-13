/**
 * fal.ai Client
 *
 * Video composition (FFmpeg), image-to-video, TTS via fal.ai
 * @see https://fal.ai/models/fal-ai/ffmpeg-api/compose
 * @see https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video/api
 */

import { fal } from '@fal-ai/client'
import { getLogger } from '@/lib/logger'

const logger = getLogger('fal-client')

// ============================================================
// Types
// ============================================================

export interface FalKeyframe {
  timestamp: number // milliseconds
  duration: number // milliseconds
  url: string
}

export interface FalTrack {
  id: string
  type: 'video' | 'audio'
  keyframes: FalKeyframe[]
}

export interface FalComposeInput {
  tracks: FalTrack[]
}

export interface FalComposeOutput {
  video_url: string
  thumbnail_url: string
}

export class FalError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message)
    this.name = 'FalError'
  }
}

// ============================================================
// Client Configuration
// ============================================================

function configureFal(): void {
  const apiKey = process.env.FAL_KEY
  if (!apiKey) {
    throw new FalError('FAL_KEY is not configured', 401)
  }
  fal.config({ credentials: apiKey })
}

// ============================================================
// Compose API
// ============================================================

/**
 * Compose video from multiple tracks using fal.ai FFmpeg API
 */
export async function composeWithFal(
  input: FalComposeInput
): Promise<FalComposeOutput> {
  configureFal()

  logger.info('Starting fal.ai compose', {
    trackCount: input.tracks.length,
    tracks: input.tracks.map((t) => ({
      id: t.id,
      type: t.type,
      keyframeCount: t.keyframes.length,
    })),
  })

  try {
    const result = await fal.subscribe('fal-ai/ffmpeg-api/compose', {
      input: {
        tracks: input.tracks,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.debug('fal.ai compose in progress', {
            logs: update.logs?.slice(-3),
          })
        }
      },
    })

    const output = result.data as FalComposeOutput

    if (!output.video_url) {
      throw new FalError('Compose completed but no video URL returned')
    }

    logger.info('fal.ai compose completed', {
      videoUrl: output.video_url,
      thumbnailUrl: output.thumbnail_url,
    })

    return output
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Compose failed'
    logger.error('fal.ai compose failed', { error: message })
    throw new FalError(message)
  }
}

// ============================================================
// Generic Image-to-Video
// ============================================================

interface FalVideoOutput {
  video: {
    url: string
    file_name?: string
    content_type?: string
    file_size?: number
  }
}

/**
 * 모델별 fal.ai 비디오 입력 빌드 (Image-to-Video)
 * @internal — 테스트 전용
 */
export function buildVideoInput(
  modelId: string,
  params: {
    imageUrl: string
    prompt: string
    duration?: string
    tailImageUrl?: string
    sound?: boolean
    aspectRatio?: string
    resolution?: string
  },
): Record<string, unknown> {
  // Hailuo/Minimax 계열 (I2V)
  if (modelId.includes('minimax') || modelId.includes('hailuo')) {
    const input: Record<string, unknown> = {
      image_url: params.imageUrl,
      prompt: params.prompt,
      duration: params.duration || '6',
      prompt_optimizer: true,
    }
    if (params.tailImageUrl) input.end_image_url = params.tailImageUrl
    return input
  }

  // Kling v3 (fal)
  if (modelId.includes('kling-video/v3')) {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      start_image_url: params.imageUrl,
      duration: params.duration || '5',
      generate_audio: params.sound ?? false,
    }
    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio
    if (params.tailImageUrl) input.end_image_url = params.tailImageUrl
    return input
  }

  // Veo3 (fal)
  if (modelId.includes('veo3')) {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      duration: params.duration || '8',
      generate_audio: params.sound ?? false,
    }
    if (params.imageUrl) input.image_url = params.imageUrl
    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio
    if (params.resolution) input.resolution = params.resolution
    return input
  }

  // Kling 2.6 Pro (기본)
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    start_image_url: params.imageUrl,
    duration: params.duration || '5',
    generate_audio: params.sound ?? false,
  }
  if (params.tailImageUrl) {
    input.end_image_url = params.tailImageUrl
  }
  return input
}

/**
 * 모델별 fal.ai Text-to-Video 입력 빌드
 * @internal — 테스트 전용
 */
export function buildTextToVideoInput(
  modelId: string,
  params: {
    prompt: string
    duration?: string
    aspectRatio?: string
    resolution?: string
    sound?: boolean
  },
): Record<string, unknown> {
  // Luma Ray 2 Flash
  if (modelId.includes('luma') || modelId.includes('ray-2')) {
    return {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio || '16:9',
      resolution: params.resolution || '720p',
      duration: params.duration || '5',
      loop: false,
    }
  }

  // Hailuo T2V
  if (modelId.includes('minimax') || modelId.includes('hailuo')) {
    return {
      prompt: params.prompt,
      duration: params.duration || '6',
      resolution: params.resolution || '1080p',
      prompt_optimizer: true,
    }
  }

  // Kling v3 T2V
  if (modelId.includes('kling-video/v3')) {
    return {
      prompt: params.prompt,
      duration: params.duration || '5',
      generate_audio: params.sound ?? false,
      ...(params.aspectRatio ? { aspect_ratio: params.aspectRatio } : {}),
    }
  }

  // Veo3 (fal)
  if (modelId.includes('veo3')) {
    return {
      prompt: params.prompt,
      duration: params.duration || '8',
      aspect_ratio: params.aspectRatio || '16:9',
      generate_audio: params.sound ?? false,
      ...(params.resolution ? { resolution: params.resolution } : {}),
    }
  }

  // Default
  return {
    prompt: params.prompt,
    duration: params.duration || '5',
    aspect_ratio: params.aspectRatio || '16:9',
  }
}

/**
 * 범용 image-to-video: modelId별 입력 매핑 지원
 */
export async function falImageToVideo(
  modelId: string,
  params: {
    imageUrl: string
    prompt: string
    duration?: string
    tailImageUrl?: string
    sound?: boolean
    aspectRatio?: string
    resolution?: string
  },
): Promise<{ url: string }> {
  configureFal()

  const startTime = Date.now()
  logger.info('Starting fal.ai image-to-video', {
    model: modelId,
    imageUrl: params.imageUrl.slice(0, 50) + '...',
    duration: params.duration || '5',
    hasTailImage: !!params.tailImageUrl,
  })

  const input = buildVideoInput(modelId, params)

  try {
    const result = await fal.subscribe(modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.debug('fal.ai video generation in progress', {
            logs: update.logs?.slice(-3),
          })
        }
      },
    })

    const output = result.data as FalVideoOutput
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!output?.video?.url) {
      logger.error('fal.ai video: no URL in response', {
        elapsedSec,
        dataKeys: Object.keys(result.data || {}),
      })
      throw new FalError('Video generation completed but no video URL returned')
    }

    logger.info('fal.ai image-to-video completed', {
      model: modelId,
      videoUrl: output.video.url.slice(0, 100),
      elapsedSec,
    })

    return { url: output.video.url }
  } catch (error) {
    if (error instanceof FalError) throw error
    const message = error instanceof Error ? error.message : 'fal.ai video generation failed'
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.error('fal.ai image-to-video failed', { error: message, model: modelId, elapsedSec })
    throw new FalError(message)
  }
}

/**
 * Kling 2.6 Pro 전용 (하위 호환)
 */
export async function imageToVideoWithFal(params: {
  imageUrl: string
  prompt: string
  duration?: '5' | '10'
  tailImageUrl?: string
}): Promise<{ url: string }> {
  return falImageToVideo('fal-ai/kling-video/v2.6/pro/image-to-video', params)
}

// ============================================================
// Text-to-Video via fal.ai
// ============================================================

/**
 * 범용 text-to-video: modelId별 입력 매핑 지원
 */
export async function falTextToVideo(
  modelId: string,
  params: {
    prompt: string
    duration?: string
    aspectRatio?: string
    resolution?: string
    sound?: boolean
  },
): Promise<{ url: string }> {
  configureFal()

  const startTime = Date.now()
  logger.info('Starting fal.ai text-to-video', {
    model: modelId,
    duration: params.duration || '5',
  })

  const input = buildTextToVideoInput(modelId, params)

  try {
    const result = await fal.subscribe(modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.debug('fal.ai text-to-video in progress', {
            logs: update.logs?.slice(-3),
          })
        }
      },
    })

    const output = result.data as FalVideoOutput
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!output?.video?.url) {
      logger.error('fal.ai text-to-video: no URL in response', {
        elapsedSec,
        dataKeys: Object.keys(result.data || {}),
      })
      throw new FalError('Text-to-video completed but no video URL returned')
    }

    logger.info('fal.ai text-to-video completed', {
      model: modelId,
      videoUrl: output.video.url.slice(0, 100),
      elapsedSec,
    })

    return { url: output.video.url }
  } catch (error) {
    if (error instanceof FalError) throw error
    const message = error instanceof Error ? error.message : 'fal.ai text-to-video failed'
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.error('fal.ai text-to-video failed', { error: message, model: modelId, elapsedSec })
    throw new FalError(message)
  }
}

// ============================================================
// TTS (ElevenLabs via fal.ai)
// ============================================================

interface FalTTSOutput {
  audio: {
    url: string
    file_name?: string
    content_type?: string
    file_size?: number
  }
}

/**
 * Text-to-Speech via fal.ai ElevenLabs
 */
export async function falTextToSpeech(params: {
  text: string
  voice?: string
  model: string
  languageCode?: string
  speed?: number
  stability?: number
  similarityBoost?: number
  style?: number
}): Promise<{ url: string }> {
  configureFal()

  const startTime = Date.now()
  logger.info('Starting fal.ai TTS', {
    model: params.model,
    textLength: params.text.length,
    voice: params.voice || 'Rachel',
  })

  try {
    const result = await fal.subscribe(params.model, {
      input: {
        text: params.text,
        voice: params.voice || 'Rachel',
        language_code: params.languageCode || 'ko',
        speed: params.speed ?? 1,
        stability: params.stability ?? 0.5,
        similarity_boost: params.similarityBoost ?? 0.75,
        style: params.style ?? 0,
      },
      logs: true,
    })

    const output = result.data as FalTTSOutput
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!output?.audio?.url) {
      throw new FalError('TTS completed but no audio URL returned')
    }

    logger.info('fal.ai TTS completed', {
      model: params.model,
      audioUrl: output.audio.url.slice(0, 100),
      elapsedSec,
    })

    return { url: output.audio.url }
  } catch (error) {
    if (error instanceof FalError) throw error
    const message = error instanceof Error ? error.message : 'fal.ai TTS failed'
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.error('fal.ai TTS failed', { error: message, model: params.model, elapsedSec })
    throw new FalError(message)
  }
}

// ============================================================
// Image: Size Mapping
// ============================================================

import { MODEL_CATALOG } from '@/lib/models/catalog'

type FalImageSize = string | { width: number; height: number }

const FAL_PRESET_MAP: Record<string, string> = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
}

/**
 * GPT Image 1.5는 3개 고정 사이즈만 지원:
 * - 1024×1024 (square)
 * - 1536×1024 (landscape)
 * - 1024×1536 (portrait)
 *
 * 다른 비율은 가장 가까운 사이즈로 매핑.
 */
const GPT_IMAGE_SIZE_MAP: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1536, height: 1024 },
  '9:16': { width: 1024, height: 1536 },
  '4:3': { width: 1024, height: 1024 },   // ~square
  '3:4': { width: 1024, height: 1024 },   // ~square
  '3:2': { width: 1536, height: 1024 },   // ~landscape
  '2:3': { width: 1024, height: 1536 },   // ~portrait
  '5:4': { width: 1024, height: 1024 },   // ~square
  '4:5': { width: 1024, height: 1024 },   // ~square
  '21:9': { width: 1536, height: 1024 },  // ~landscape
}

const RESOLUTION_BASE: Record<string, number> = {
  '1K': 1024,
  '2K': 2048,
  '4K': 4096,
}

/** 64px 배수 반올림 (fal.ai 모델 최적 해상도 요구사항) */
function roundTo64(n: number): number {
  return Math.round(n / 64) * 64
}

/** @internal — 테스트 전용. aspectRatio + resolution → fal image_size */
export function mapToFalImageSize(
  modelId: string,
  aspectRatio: string,
  resolution: string,
): FalImageSize {
  // GPT Image 1.5: 고정 사이즈만
  if (modelId.includes('gpt-image')) {
    const size = GPT_IMAGE_SIZE_MAP[aspectRatio]
    return size || { width: 1024, height: 1024 }
  }

  // 1K → fal 프리셋 (지원되는 비율만)
  if (resolution === '1K') {
    const preset = FAL_PRESET_MAP[aspectRatio]
    if (preset) return preset
  }

  // 커스텀 {w, h} 계산
  const base = RESOLUTION_BASE[resolution] || 1024
  const parts = aspectRatio.split(':').map(Number)
  const w = parts[0] || 16
  const h = parts[1] || 9
  const scale = base / Math.max(w, h)
  return {
    width: roundTo64(w * scale),
    height: roundTo64(h * scale),
  }
}

// ============================================================
// Image: Transport Schema (모델별 fal API 파라미터 차이 정의)
// ============================================================

/** @internal — 테스트 전용. fal.ai 모델별 전송 스키마 */
export interface FalTransport {
  /** 사이즈 파라미터 이름. null = 사이즈 파라미터 없음 */
  sizeParam: 'image_size' | 'aspect_ratio' | null
  /** Edit 시 이미지 URL 파라미터 이름 */
  imageUrlParam: 'image_urls' | 'image_url'
  /** output_format 파라미터 지원 여부 */
  supportsOutputFormat: boolean
}

/** @internal — 테스트 전용. 16개 fal 이미지 모델의 전송 스키마 맵 */
export const FAL_TRANSPORT_MAP: Record<string, FalTransport> = {
  // Flux Family (6개) — image_size + output_format
  'fal-ai/flux-2-pro':       { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/flux-2-pro/edit':  { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/flux-2-flex':      { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/flux-2-flex/edit': { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/flux-2-max':       { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/flux-2-max/edit':  { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },

  // Seedream (4개) — image_size, NO output_format
  'fal-ai/bytedance/seedream/v4.5/text-to-image': { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: false },
  'fal-ai/bytedance/seedream/v4.5/edit':           { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: false },
  'fal-ai/bytedance/seedream/v4/text-to-image':    { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: false },
  'fal-ai/bytedance/seedream/v4/edit':              { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: false },

  // GPT Image 1.5 (2개) — image_size (고정 3사이즈), output_format
  'fal-ai/gpt-image-1.5':      { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/gpt-image-1.5/edit': { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: true },

  // Reve (2개) — CRITICAL: T2I=aspect_ratio, Edit=singular image_url + no size
  'fal-ai/reve/text-to-image': { sizeParam: 'aspect_ratio', imageUrlParam: 'image_urls', supportsOutputFormat: true },
  'fal-ai/reve/edit':           { sizeParam: null,           imageUrlParam: 'image_url',  supportsOutputFormat: true },

  // Wan 2.6 (2개) — image_size, NO output_format
  'wan/v2.6/text-to-image':   { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: false },
  'wan/v2.6/image-to-image':  { sizeParam: 'image_size', imageUrlParam: 'image_urls', supportsOutputFormat: false },
}

/** @internal — 테스트 전용. 미등록 모델은 명시 에러 (fail-closed) */
export function getFalTransport(modelId: string): FalTransport {
  const transport = FAL_TRANSPORT_MAP[modelId]
  if (!transport) {
    throw new FalError(`Unregistered fal model: ${modelId}. Add transport config to FAL_TRANSPORT_MAP.`)
  }
  return transport
}

// ============================================================
// Image: Input Builders
// ============================================================

interface FalImageOutput {
  images: Array<{ url: string; content_type: string; width: number; height: number }>
}

/** @internal — 테스트 전용. T2I 모델별 fal 입력 빌드 */
export function buildImageGenerateInput(
  modelId: string,
  params: { prompt: string; aspectRatio?: string; resolution?: string },
): Record<string, unknown> {
  const transport = getFalTransport(modelId)
  const aspectRatio = params.aspectRatio || '16:9'
  const resolution = params.resolution || '1K'

  const input: Record<string, unknown> = { prompt: params.prompt }

  switch (transport.sizeParam) {
    case 'image_size':
      input.image_size = mapToFalImageSize(modelId, aspectRatio, resolution)
      break
    case 'aspect_ratio':
      input.aspect_ratio = aspectRatio
      break
    // null → 사이즈 파라미터 없음
  }

  if (transport.supportsOutputFormat) {
    input.output_format = 'png'
  }

  return input
}

/** @internal — 테스트 전용. I2I 모델별 fal 입력 빌드 */
export function buildImageEditInput(
  modelId: string,
  params: { prompt: string; imageUrls: string[]; aspectRatio?: string; resolution?: string },
): Record<string, unknown> {
  if (params.imageUrls.length === 0) {
    throw new FalError('buildImageEditInput: imageUrls cannot be empty')
  }

  // nano-banana-pro/edit: 레거시 포맷 (하위 호환)
  if (modelId === 'fal-ai/nano-banana-pro/edit') {
    const aspectRatio = params.aspectRatio || '16:9'
    const resolution = params.resolution || '1K'
    return {
      prompt: params.prompt,
      image_urls: params.imageUrls,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: 'png',
    }
  }

  const transport = getFalTransport(modelId)
  const aspectRatio = params.aspectRatio || '16:9'
  const resolution = params.resolution || '1K'

  // catalog에서 maxRefImages 제한 확인
  const catalog = MODEL_CATALOG.find(m => m.id === modelId)
  const maxRefs = catalog?.constraints?.maxRefImages
  const imageUrls = maxRefs && params.imageUrls.length > maxRefs
    ? params.imageUrls.slice(0, maxRefs)
    : params.imageUrls

  const input: Record<string, unknown> = { prompt: params.prompt }

  // 이미지 URL (단수 vs 복수)
  if (transport.imageUrlParam === 'image_url') {
    input.image_url = imageUrls[0]
  } else {
    input.image_urls = imageUrls
  }

  // 사이즈 파라미터
  switch (transport.sizeParam) {
    case 'image_size':
      input.image_size = mapToFalImageSize(modelId, aspectRatio, resolution)
      break
    case 'aspect_ratio':
      input.aspect_ratio = aspectRatio
      break
    case null:
      if (params.aspectRatio || params.resolution) {
        logger.warn('Model does not support size params, ignoring', {
          modelId, requestedAspectRatio: params.aspectRatio, resolution: params.resolution,
        })
      }
      break
  }

  if (transport.supportsOutputFormat) {
    input.output_format = 'png'
  }

  return input
}

// ============================================================
// Image Generate (T2I via fal.ai)
// ============================================================

/**
 * Text-to-Image via fal.ai
 */
export async function falImageGenerate(params: {
  modelId: string
  prompt: string
  aspectRatio?: string
  resolution?: string
}): Promise<{ url: string }> {
  configureFal()

  const startTime = Date.now()
  const input = buildImageGenerateInput(params.modelId, params)

  logger.info('Starting fal.ai image generate', {
    model: params.modelId,
    requestedAspectRatio: params.aspectRatio,
    resolution: params.resolution,
    imageSize: input.image_size ?? input.aspect_ratio ?? 'none',
    hasOutputFormat: 'output_format' in input,
  })

  try {
    const result = await fal.subscribe(params.modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.debug('fal.ai image generate in progress', {
            logs: update.logs?.slice(-3),
          })
        }
      },
    })

    const output = result.data as FalImageOutput
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!output?.images?.[0]?.url) {
      throw new FalError('Image generation completed but no image URL returned')
    }

    logger.info('fal.ai image generate completed', {
      model: params.modelId,
      imageUrl: output.images[0].url.slice(0, 100),
      receivedSize: { width: output.images[0].width, height: output.images[0].height },
      elapsedSec,
    })

    return { url: output.images[0].url }
  } catch (error) {
    if (error instanceof FalError) throw error
    const message = error instanceof Error ? error.message : 'fal.ai image generation failed'
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.error('fal.ai image generate failed', { error: message, model: params.modelId, elapsedSec })
    throw new FalError(message)
  }
}

// ============================================================
// Image Edit (참조 이미지 기반 via fal.ai)
// ============================================================

/**
 * Image Edit via fal.ai (참조 이미지 기반)
 *
 * fal은 URL을 직접 전달하므로 base64 변환 불필요.
 */
export async function falImageEdit(params: {
  modelId: string
  prompt: string
  imageUrls: string[]
  aspectRatio?: string
  resolution?: string
}): Promise<{ url: string }> {
  configureFal()

  const startTime = Date.now()
  const input = buildImageEditInput(params.modelId, params)

  logger.info('Starting fal.ai image edit', {
    model: params.modelId,
    imageCount: params.imageUrls.length,
    requestedAspectRatio: params.aspectRatio,
    resolution: params.resolution,
    imageSize: input.image_size ?? input.aspect_ratio ?? 'none',
    hasOutputFormat: 'output_format' in input,
    imageUrlParam: input.image_url ? 'image_url' : 'image_urls',
  })

  try {
    const result = await fal.subscribe(params.modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.debug('fal.ai image edit in progress', {
            logs: update.logs?.slice(-3),
          })
        }
      },
    })

    const output = result.data as FalImageOutput
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!output?.images?.[0]?.url) {
      throw new FalError('Image edit completed but no image URL returned')
    }

    logger.info('fal.ai image edit completed', {
      model: params.modelId,
      imageUrl: output.images[0].url.slice(0, 100),
      receivedSize: { width: output.images[0].width, height: output.images[0].height },
      elapsedSec,
    })

    return { url: output.images[0].url }
  } catch (error) {
    if (error instanceof FalError) throw error
    const message = error instanceof Error ? error.message : 'fal.ai image edit failed'
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.error('fal.ai image edit failed', { error: message, model: params.modelId, elapsedSec })
    throw new FalError(message)
  }
}

// ============================================================
// Utility
// ============================================================

/**
 * Check if fal.ai is configured
 */
export function isFalAvailable(): boolean {
  return !!process.env.FAL_KEY
}

/**
 * Convert seconds to milliseconds for fal.ai API
 */
export function secToMs(seconds: number): number {
  return Math.round(seconds * 1000)
}
