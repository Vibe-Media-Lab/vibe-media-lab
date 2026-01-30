import { z } from 'zod'

export const MediaTypeSchema = z.enum(['image', 'video', 'tts', 'bgm'])
export type MediaType = z.infer<typeof MediaTypeSchema>

export const GenerationStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
])
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>

export interface GenerationConfig {
  prompt: string
  aspectRatio?: string
  model?: string
  [key: string]: unknown
}

export interface GenerationResult {
  success: boolean
  outputUrl?: string
  error?: string
  latencyMs: number
  cost: number
  metadata?: Record<string, unknown>
}

export interface ProviderCapabilities {
  supportedMediaTypes: MediaType[]
  supportedModels: string[]
  maxPromptLength: number
  supportsAsync: boolean
}

export abstract class BaseProvider {
  abstract readonly name: string
  abstract readonly capabilities: ProviderCapabilities

  abstract generate(
    mediaType: MediaType,
    config: GenerationConfig
  ): Promise<GenerationResult>

  abstract checkHealth(): Promise<boolean>

  supportsMediaType(mediaType: MediaType): boolean {
    return this.capabilities.supportedMediaTypes.includes(mediaType)
  }

  supportsModel(model: string): boolean {
    return this.capabilities.supportedModels.includes(model)
  }
}
