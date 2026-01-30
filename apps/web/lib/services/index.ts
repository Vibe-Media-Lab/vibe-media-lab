/**
 * Media Generation Services
 *
 * Direct HTTP API clients for AI media generation
 *
 * Providers:
 * - Image: Direct Gemini API (gemini-3-pro-image-preview) / Kie.ai fallback
 * - Video: Kie.ai Kling 2.6
 * - Audio: Kie.ai ElevenLabs + Suno
 * - LLM: Google Gemini API (gemini-2.5-flash)
 *
 * Environment Variables:
 * - GEMINI_API_KEY: Google Gemini API key (Image, LLM)
 * - KIEAI_API_KEY: Kie.ai unified API key (Video, Audio, Image fallback)
 *
 * Usage:
 * ```typescript
 * import { imageService, videoService, audioService, llmService } from '@/lib/services'
 *
 * // Generate image
 * const result = await imageService.generateImage({
 *   prompt: 'A cute cartoon character',
 *   aspectRatio: '16:9',
 * })
 *
 * // Batch image generation with progress
 * const batchResult = await imageService.batchEditImages({
 *   tasks: [...],
 * }, (current, total) => console.log(`${current}/${total}`))
 * ```
 */

// Types
export * from './types'

// Gemini Image Client (Direct API)
export {
  isGeminiImageAvailable,
  GeminiImageError,
  generateImageFromText,
  generateImageFromReference,
  urlToBase64,
  urlsToBase64,
} from './gemini-image-client'
export type {
  GeminiAspectRatio,
  GeminiImageSize,
  GeminiImageGenerateParams,
  GeminiImageEditParams,
  GeminiImageResult,
} from './gemini-image-client'

// Image Storage
export {
  saveImage,
  saveImages,
  deleteImage,
  cleanupOldImages,
  getStorageStats,
} from './image-storage'
export type { SaveImageResult, SaveImageParams } from './image-storage'

// Kie.ai Client (Fallback)
export { isKieaiAvailable, KieaiError } from './kieai-client'

// Image Service (Nano Banana)
export * as imageService from './image-service'
export {
  generateImage,
  editImage,
  batchEditImages,
  isImageServiceAvailable,
  getImageServiceProvider,
} from './image-service'

// Video Service (Kling)
export * as videoService from './video-service'
export {
  imageToVideo,
  textToVideo,
  generateVideosSequentially,
  isVideoServiceAvailable,
  getVideoServiceProvider,
  estimateVideoGenerationTime,
} from './video-service'

// Audio Service (ElevenLabs + Suno)
export * as audioService from './audio-service'
export {
  generateTTS,
  batchGenerateTTS,
  generateBGM,
  isAudioServiceAvailable,
  getAudioServiceProvider,
  estimateTTSDuration,
  estimateTTSGenerationTime,
} from './audio-service'

// LLM Service (Gemini)
export * as llmService from './llm-service'
export {
  generateStory,
  generateScript,
  isLLMServiceAvailable,
  getLLMServiceProvider,
} from './llm-service'
export type {
  StoryGenerationParams,
  ScriptGenerationParams,
  GeneratedScript,
} from './llm-service'

// ============================================================
// Service Status
// ============================================================

import type { ServiceStatus } from './types'
import { getImageServiceProvider } from './image-service'
import { getVideoServiceProvider } from './video-service'
import { getAudioServiceProvider } from './audio-service'
import { getLLMServiceProvider } from './llm-service'

export function getServiceStatus(): ServiceStatus {
  return {
    image: {
      available: getImageServiceProvider() !== 'mock',
      provider: getImageServiceProvider(),
    },
    video: {
      available: getVideoServiceProvider() !== 'mock',
      provider: getVideoServiceProvider(),
    },
    audio: {
      available: getAudioServiceProvider() !== 'mock',
      provider: getAudioServiceProvider(),
    },
    llm: {
      available: getLLMServiceProvider() !== 'mock',
      provider: getLLMServiceProvider(),
    },
  }
}

export function isAllServicesAvailable(): boolean {
  const status = getServiceStatus()
  return (
    status.image.available &&
    status.video.available &&
    status.audio.available &&
    status.llm.available
  )
}
