/**
 * Media Service Types
 *
 * Unified types for all media generation services
 */

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
  | 'nano-banana' // Gemini 2.5 Flash Image
  | 'nano-banana-pro' // Gemini 3 Pro Image

export type ImageResolution = '1K' | '2K' | '4K'

export interface ImageGenerateParams {
  prompt: string
  aspectRatio?: AspectRatio
  model?: ImageModel
  resolution?: ImageResolution
}

export interface ImageEditParams {
  prompt: string
  referenceUrls: string[]
  aspectRatio?: AspectRatio
  model?: ImageModel
  resolution?: ImageResolution
}

export interface ImageBatchEditParams {
  tasks: Array<{
    prompt: string
    referenceUrls: string[]
  }>
  aspectRatio?: AspectRatio
  model?: ImageModel
  resolution?: ImageResolution
}

// ============================================================
// Video Generation
// ============================================================

export type VideoDuration = '5' | '10'

export type VideoModel =
  | 'kling-2.6/image-to-video'
  | 'kling-2.6/text-to-video'

export interface ImageToVideoParams {
  imageUrl: string
  prompt: string
  duration?: VideoDuration
  sound?: boolean
  tailImageUrl?: string
}

export interface TextToVideoParams {
  prompt: string
  duration?: VideoDuration
  aspectRatio?: '1:1' | '9:16' | '16:9'
  sound?: boolean
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

export interface TTSParams {
  text: string
  voice?: TTSVoice
  languageCode?: string
  speed?: number
  stability?: number
  similarityBoost?: number
  style?: number
}

export interface TTSBatchParams {
  tasks: Array<{
    text: string
    voice?: TTSVoice
  }>
  languageCode?: string
}

export type BGMModel = 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5'

export interface BGMParams {
  prompt: string
  instrumental?: boolean
  model?: BGMModel
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
  metadata?: Record<string, unknown>
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

export type ServiceProvider = 'kieai' | 'gemini' | 'mock'

export interface ServiceStatus {
  image: {
    available: boolean
    provider: ServiceProvider
  }
  video: {
    available: boolean
    provider: 'kieai' | 'mock'
  }
  audio: {
    available: boolean
    provider: 'kieai' | 'mock'
  }
  llm: {
    available: boolean
    provider: 'gemini' | 'mock'
  }
}
