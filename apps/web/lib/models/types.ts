// ─── Capability ───
export type ModelCapability =
  | 'text-to-image'
  | 'image-to-image'
  | 'image-to-video'
  | 'text-to-video'
  | 'tts'
  | 'bgm'
  | 'composition'

// ─── Provider ───
export type ModelProvider = 'fal' | 'kieai' | 'gemini'

// ─── Catalog Entry (전체 후보) ───
export interface CatalogModel {
  id: string
  label: string
  provider: ModelProvider
  capabilities: ModelCapability[]
  description?: string
  meta: {
    quality: 'high' | 'standard'
    speed: 'fast' | 'standard'
    cost: 'low' | 'medium' | 'high'
    badge?: string
    priceNote?: string
  }
  constraints?: {
    durations?: string[]
    resolutions?: string[]
    videoResolutions?: string[]
    maxRefImages?: number
    languages?: string[]
    aspectRatios?: string[]
    supportsSound?: boolean
    supportsEndFrame?: boolean
  }
}

// ─── Enabled Config (운영 노출) ───
export interface EnabledConfig {
  /** 활성 모델 ID 목록 (순서 = UI 표시 순서) */
  models: string[]
  /** 접힌 상태에서 기본 노출 */
  featured: string[]
  /** 기본 선택값 */
  defaultId: string
  /** 추천 배지 표시 */
  recommendedId: string
  /** 명시 fallback 매핑: { primaryId → fallbackId } */
  fallbacks: Record<string, string>
}

// ─── Workflow Policy ───

export interface StepModelPolicy {
  allowedModels: string[]
  defaultModel: string
  featured: string[]
  fallbacks: Record<string, string>
  recommendedModel?: string
}

export interface WorkflowPolicy {
  workflowId: string
  label: string
  /** key = `${stepId}:${capability}` (예: 'videos:image-to-video', 'audio:secondary:bgm') */
  steps: Record<string, StepModelPolicy>
}

// ─── Result Metadata (실제 사용 기록) ───
export interface ResultMeta {
  requestedModel: string
  actualModel: string
  actualProvider: ModelProvider
  latencyMs: number
  fallbackUsed: boolean
}
