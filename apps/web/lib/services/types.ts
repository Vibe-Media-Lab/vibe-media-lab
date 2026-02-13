/**
 * Media Service Types
 *
 * Unified types for all media generation services
 */

import type { RouteOverrides } from '@/lib/models/router'

// ============================================================
// Library Save Options (자동 저장용)
// ============================================================

export interface LibrarySaveOptions {
  /** User ID - 제공하면 자동으로 Library에 저장 */
  userId?: string
  /** Project ID - 프로젝트에 연결 */
  projectId?: string
  /** Session ID for grouping */
  sessionId?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// ============================================================
// Image Generation
// ============================================================

export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'

export type ImageModel =
  // Legacy / Gemini
  | 'nano-banana' // Gemini 2.5 Flash Image (kieai) — legacy
  | 'nano-banana-pro' // Gemini 3 Pro Image (kieai)
  | 'fal-ai/nano-banana-pro/edit' // Gemini 3 Pro Edit (fal.ai)
  | 'gemini-3-pro-image-preview' // Direct Gemini API (fallback)
  | 'gemini-2.5-flash-image' // Direct Gemini API (fallback)
  // Flux 2 (BFL via fal)
  | 'fal-ai/flux-2-pro'
  | 'fal-ai/flux-2-pro/edit'
  | 'fal-ai/flux-2-flex'
  | 'fal-ai/flux-2-flex/edit'
  | 'fal-ai/flux-2-max'
  | 'fal-ai/flux-2-max/edit'
  // Seedream (ByteDance via fal)
  | 'fal-ai/bytedance/seedream/v4.5/text-to-image'
  | 'fal-ai/bytedance/seedream/v4.5/edit'
  | 'fal-ai/bytedance/seedream/v4/text-to-image'
  | 'fal-ai/bytedance/seedream/v4/edit'
  // GPT Image (OpenAI via fal)
  | 'fal-ai/gpt-image-1.5'
  | 'fal-ai/gpt-image-1.5/edit'
  // Reve (fal)
  | 'fal-ai/reve/text-to-image'
  | 'fal-ai/reve/edit'
  // Wan (Alibaba via fal)
  | 'wan/v2.6/text-to-image'
  | 'wan/v2.6/image-to-image'

export type ImageResolution = '1K' | '2K' | '4K'

export interface ImageGenerateParams extends LibrarySaveOptions {
  prompt: string
  aspectRatio?: AspectRatio
  model?: ImageModel | string
  resolution?: ImageResolution
  routeOverrides?: RouteOverrides
}

export interface ImageEditParams extends LibrarySaveOptions {
  prompt: string
  referenceUrls: string[]
  aspectRatio?: AspectRatio
  model?: ImageModel | string
  resolution?: ImageResolution
  routeOverrides?: RouteOverrides
}

export interface ImageBatchEditParams extends LibrarySaveOptions {
  tasks: Array<{
    prompt: string
    referenceUrls: string[]
  }>
  aspectRatio?: AspectRatio
  model?: ImageModel | string
  resolution?: ImageResolution
  routeOverrides?: RouteOverrides
}

// ============================================================
// Video Generation
// ============================================================

export type VideoDuration = string

export interface ImageToVideoParams extends LibrarySaveOptions {
  imageUrl: string
  prompt: string
  duration?: string
  aspectRatio?: string
  sound?: boolean
  tailImageUrl?: string
  model?: string
  resolution?: string
  routeOverrides?: RouteOverrides
}

export interface TextToVideoParams extends LibrarySaveOptions {
  prompt: string
  duration?: string
  aspectRatio?: string
  sound?: boolean
  model?: string
  resolution?: string
  routeOverrides?: RouteOverrides
}

// ============================================================
// Audio Generation
// ============================================================

export type TTSVoice =
  | 'Rachel'
  | 'Aria'
  | 'Roger'
  | 'Sarah'
  | 'Laura'
  | 'Charlie'
  | 'George'
  | 'Callum'
  | 'River'
  | 'Liam'
  | 'Charlotte'
  | 'Alice'
  | 'Matilda'
  | 'Will'
  | 'Jessica'
  | 'Eric'
  | 'Chris'
  | 'Brian'
  | 'Daniel'
  | 'Lily'
  | 'Bill'

export type TTSModel =
  | 'elevenlabs/text-to-speech-turbo-2-5'
  | 'elevenlabs/text-to-speech-multilingual-v2'
  | 'fal-ai/elevenlabs/tts/multilingual-v2'
  | 'fal-ai/elevenlabs/tts/turbo-v2.5'

export interface TTSParams extends LibrarySaveOptions {
  text: string
  voice?: TTSVoice | string // ElevenLabs voice ID도 허용
  languageCode?: string
  speed?: number
  stability?: number
  similarityBoost?: number
  style?: number
  model?: string
  routeOverrides?: RouteOverrides
}

export interface TTSBatchParams extends LibrarySaveOptions {
  tasks: Array<{
    text: string
    voice?: TTSVoice
    speed?: number
    stability?: number
    similarityBoost?: number
    style?: number
  }>
  languageCode?: string
}

export type BGMModel = 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5'

export interface BGMParams extends LibrarySaveOptions {
  prompt: string
  instrumental?: boolean
  model?: BGMModel | string
  style?: string
  title?: string
}

// ============================================================
// Result Types
// ============================================================

export interface GenerationResult {
  success: boolean
  url?: string
  error?: string
  taskId?: string
  dbId?: string // Library에 저장된 레코드 ID
  metadata?: Record<string, unknown> & {
    requestedModel?: string
    actualModel?: string
    actualProvider?: string
    latencyMs?: number
    fallbackUsed?: boolean
  }
}

export interface BGMTrack {
  id: string
  url: string
  duration: number
  title?: string
  imageUrl?: string
}

export interface BGMGenerationResult {
  success: boolean
  tracks: BGMTrack[]
  taskId?: string
  error?: string
}

export interface BatchGenerationResult {
  success: boolean
  results: Array<{
    index: number
    success: boolean
    url?: string
    error?: string
  }>
  totalSuccess: number
  totalFailed: number
}

// ============================================================
// Service Status
// ============================================================

export type ServiceProvider = 'kieai' | 'gemini' | 'fal' | 'mock'

export interface ServiceStatus {
  image: {
    available: boolean
    provider: ServiceProvider
  }
  video: {
    available: boolean
    provider: 'fal' | 'kieai' | 'mock'
  }
  audio: {
    available: boolean
    provider: 'fal' | 'kieai' | 'mock'
  }
  llm: {
    available: boolean
    provider: 'gemini' | 'mock'
  }
  composition: {
    available: boolean
    provider: 'fal' | 'mock'
  }
}

// ============================================================
// Video Composition
// ============================================================

export interface ComposeVideoShot {
  id: string
  shotNumber: number
  duration: number
  videoUrl: string
  audioUrl: string
}

export interface ComposeVideoParams extends LibrarySaveOptions {
  shots: ComposeVideoShot[]
  bgmUrl: string
  bgmVolume?: number // 기본값 0.3 (30%)
  width?: number // 기본값 1920
  height?: number // 기본값 1080
  frameRate?: number // 기본값 30
}

export interface ComposeVideoResult {
  success: boolean
  videoUrl?: string
  duration?: number
  renderId?: string
  error?: string
}

export interface ThumbnailGenerateParams extends LibrarySaveOptions {
  title: string
  style: string
  aspectRatio?: AspectRatio
  logline?: string
  characters?: Array<{ name: string; visualDescription: string }>
  referenceUrls?: string[]
}

export interface ThumbnailGenerateResult {
  success: boolean
  url?: string
  error?: string
}
