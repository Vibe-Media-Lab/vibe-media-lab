import { z } from 'zod'
import type { ApiStepResult } from '@/lib/workflow/helpers'
import {
  ALLOWED_TEXT_TO_IMAGE_MODELS,
  ALLOWED_IMAGE_TO_IMAGE_MODELS,
} from '@/lib/constants/model-options'
import { getStepPolicy } from '@/lib/models/workflow-policies'
import { CHARACTER_ARCHETYPES } from '@/lib/data/character-archetypes'

// 아키타입 allowlist (서버측 검증용)
const ARCHETYPE_IDS = CHARACTER_ARCHETYPES.map((a) => a.id) as [string, ...string[]]

// Character Creator 워크플로우 정책에서 허용 모델 추출 (전역과 격리)
function extractModels(
  policy: ReturnType<typeof getStepPolicy>,
  fallback: readonly [string, ...string[]],
): readonly [string, ...string[]] {
  if (!policy || policy.allowedModels.length === 0) return fallback
  const [first, ...rest] = policy.allowedModels
  return [first, ...rest] as [string, ...string[]]
}

const CHARACTER_T2I_MODELS = extractModels(
  getStepPolicy('character-creator', 'main-visual', 'text-to-image'),
  ALLOWED_TEXT_TO_IMAGE_MODELS,
)

const CHARACTER_I2I_MODELS = extractModels(
  getStepPolicy('character-creator', 'character-sheet', 'image-to-image'),
  ALLOWED_IMAGE_TO_IMAGE_MODELS,
)

// ============================================================
// Request Schemas
// ============================================================

export const QuickstartRequestSchema = z.object({
  sessionId: z.string(),
  archetype: z.enum(ARCHETYPE_IDS),
  freeText: z.string().max(500).optional(),
}).refine(
  (d) => d.archetype !== 'freetext' || (d.freeText && d.freeText.trim().length > 0),
  { message: '자유 입력 모드에서는 캐릭터 설명을 입력해주세요', path: ['freeText'] }
)
export type QuickstartRequest = z.infer<typeof QuickstartRequestSchema>

export const MainVisualRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  characterProfile: z.object({
    name: z.string().max(200),
    personality: z.string().max(2000),
    visualDescription: z.string().max(2000),
    backstory: z.string().max(2000),
  }),
  model: z.enum(CHARACTER_T2I_MODELS).optional(),
  count: z.number().int().min(1).max(8).default(4),
  regenerateIndex: z.number().int().min(0).max(7).optional(),
})
export type MainVisualRequest = z.infer<typeof MainVisualRequestSchema>

export const CharacterSheetRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  selectedImageUrl: z.string().url(),
  characterProfile: z.object({
    name: z.string().max(200),
    visualDescription: z.string().max(2000),
  }),
  model: z.enum(CHARACTER_I2I_MODELS).optional(),
  regenerateVariationId: z.string().optional(),
})
export type CharacterSheetRequest = z.infer<typeof CharacterSheetRequestSchema>

// ============================================================
// Response Types
// ============================================================

export interface CharacterProfile {
  name: string
  personality: string
  visualDescription: string
  backstory: string
  archetype: string
}

export interface QuickstartResponse {
  sessionId: string
  profile: CharacterProfile
}

export interface MainVisualResponse {
  sessionId: string
  images: Array<{ id: string; url: string; prompt: string; status?: 'completed' | 'failed' }>
}

export interface CharacterSheetResponse {
  sessionId: string
  selectedImageUrl: string
  characterName: string
  characterDescription: string
  sheets: Array<{ id: string; url: string; variation: string; status?: 'completed' | 'failed' }>
}

// ============================================================
// Step Context Types
// ============================================================

// Re-export workflow helpers (하위 호환)
export type { ApiStepResult } from '@/lib/workflow/helpers'
export { unwrapStepResult, unwrapApiData } from '@/lib/workflow/helpers'

export interface CharacterArchetypeData {
  archetype: string
  freeText?: string
}

export interface CharacterCreatorContext {
  archetype: CharacterArchetypeData | null
  quickstart: ApiStepResult<QuickstartResponse> | null
  'main-visual': ApiStepResult<MainVisualResponse> | null
  'character-sheet': ApiStepResult<CharacterSheetResponse> | null
}

/**
 * Record<string, unknown> → Partial<CharacterCreatorContext> 좁히기
 */
export function asCharacterContext(ctx: Record<string, unknown> | undefined): Partial<CharacterCreatorContext> {
  return (ctx ?? {}) as Partial<CharacterCreatorContext>
}
