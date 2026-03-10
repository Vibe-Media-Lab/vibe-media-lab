import { z } from 'zod'
import type {
  KidsStory,
  KidsScript,
  KidsShot,
  KidsAnchor,
} from '@vibe-media-lab/shared'
import type { ApiStepResult } from '@/lib/workflow/helpers'
import {
  ALLOWED_TEXT_TO_IMAGE_MODELS,
  ALLOWED_IMAGE_TO_IMAGE_MODELS,
  ALLOWED_VIDEO_MODELS,
  ALLOWED_TTS_MODELS,
  ALLOWED_BGM_MODELS,
} from '@/lib/constants/model-options'
import { getStepPolicy } from '@/lib/models/workflow-policies'

// Kids Animation 워크플로우 정책에서 허용 모델 추출 (전역과 격리)
const KIDS_T2I_MODELS = (() => {
  const p = getStepPolicy('kids-animation', 'anchors', 'text-to-image')
  if (!p || p.allowedModels.length === 0) return ALLOWED_TEXT_TO_IMAGE_MODELS
  return p.allowedModels as unknown as readonly [string, ...string[]]
})()

const KIDS_I2I_MODELS = (() => {
  const p = getStepPolicy('kids-animation', 'expand', 'image-to-image')
  if (!p || p.allowedModels.length === 0) return ALLOWED_IMAGE_TO_IMAGE_MODELS
  return p.allowedModels as unknown as readonly [string, ...string[]]
})()

const KIDS_VIDEO_MODELS = (() => {
  const p = getStepPolicy('kids-animation', 'videos', 'image-to-video')
  if (!p || p.allowedModels.length === 0) return ALLOWED_VIDEO_MODELS
  return p.allowedModels as unknown as readonly [string, ...string[]]
})()

// ============================================================
// Request Schemas
// ============================================================

export const StoryRequestSchema = z.object({
  sessionId: z.string(),
  topic: z.string().min(1).max(500),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
})
export type StoryRequest = z.infer<typeof StoryRequestSchema>

// Legacy plot format
const LegacyPlotSchema = z.object({
  opening: z.string(),
  incitingIncident: z.string(),
  risingAction: z.string(),
  climax: z.string(),
  fallingAction: z.string(),
  resolution: z.string(),
})

// Enhanced Zootopia plot format
const ZootopiaActSchema = z.object({
  title: z.string(),
  summary: z.string().optional(), // May not be present in generated stories
  narration: z.string(),
  visualPrompt: z.string(),
  emotion: z.string(),
  cameraAngle: z.string().optional(), // wide shot, close-up, medium shot, etc.
})

const EnhancedPlotSchema = z.object({
  hook: ZootopiaActSchema,
  duo: ZootopiaActSchema,
  journey: ZootopiaActSchema,
  twist: ZootopiaActSchema,
  action: ZootopiaActSchema,
  resolution: ZootopiaActSchema,
})

// Character schema for enhanced stories
const CharacterSchema = z.object({
  name: z.string(),
  role: z.enum(['protagonist_a', 'protagonist_b', 'villain', 'supporting']),
  species: z.string(),
  personality: z.string(),
  visualDescription: z.string(),
  goal: z.string(), // 캐릭터의 목표/욕망
  flaw: z.string(), // 극복해야 할 약점
  voiceId: z.string().optional(),
  speakingStyle: z.string().optional(),
})

// Setting schema for enhanced stories
const SettingSchema = z.object({
  world: z.string(),
  mainLocations: z.array(z.string()),
  locationVisualDescriptions: z.array(z.string()).optional(), // 장소별 시각적 설명 (영어)
  atmosphere: z.string(),
})

// Flexible story schema (accepts both legacy and enhanced)
const FlexibleStorySchema = z.object({
  title: z.string(),
  logline: z.string().optional(), // 한 문장 스토리 요약
  lesson: z.string(),
  synopsis: z.string(),
  // Optional enhanced fields
  characters: z.array(CharacterSchema).optional(),
  setting: SettingSchema.optional(),
  // Plot can be either format
  plot: z.union([LegacyPlotSchema, EnhancedPlotSchema]),
  bgmDirection: z.string().optional(), // BGM 음악적 방향
})

export const ScriptRequestSchema = z.object({
  sessionId: z.string(),
  story: FlexibleStorySchema,
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
})
export type ScriptRequest = z.infer<typeof ScriptRequestSchema>

export const AnchorsRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  anchorPrompts: z.array(z.object({
    id: z.string(),
    category: z.enum(['character', 'background']),
    name: z.string(),
    prompt: z.string(),
  })),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  model: z.enum(KIDS_T2I_MODELS).optional(),
})
export type AnchorsRequest = z.infer<typeof AnchorsRequestSchema>

export const ShotsRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  script: z.object({
    shots: z.array(z.object({
      id: z.string(),
      shotNumber: z.number(),
      duration: z.number(),
      narration: z.string(),
      visualPrompt: z.string(),
      emotion: z.string().optional(),
      speaker: z.string().optional(),
      characters: z.array(z.string()).optional(),
      location: z.string().optional(),
    })),
  }),
  anchors: z.array(z.object({
    id: z.string(),
    category: z.enum(['character', 'background']),
    name: z.string(),
    url: z.string(),
  })),
  expanded: z.array(z.object({
    id: z.string(),
    originalId: z.string(),
    category: z.enum(['character', 'background']),
    name: z.string(),
    variation: z.string(),
    url: z.string(),
  })).optional().default([]),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  model: z.enum(KIDS_I2I_MODELS).optional(),
})
export type ShotsRequest = z.infer<typeof ShotsRequestSchema>

// 단일 비디오 생성 요청 (클라이언트 순차 호출용)
export const VideoRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  shot: z.object({
    id: z.string(),
    shotNumber: z.number(),
    duration: z.number(),
    imageUrl: z.string(),
    visualPrompt: z.string(),
  }),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  model: z.enum(KIDS_VIDEO_MODELS).optional(),
})
export type VideoRequest = z.infer<typeof VideoRequestSchema>

// Legacy: 다중 비디오 요청 (deprecated - SSE 방식)
export const VideosRequestSchema = z.object({
  sessionId: z.string(),
  shots: z.array(z.object({
    id: z.string(),
    shotNumber: z.number(),
    duration: z.number(),
    imageUrl: z.string(),
    visualPrompt: z.string(),
  })),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
})
export type VideosRequest = z.infer<typeof VideosRequestSchema>

export const AudioRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  shots: z.array(z.object({
    id: z.string(),
    shotNumber: z.number(),
    narration: z.string(),
  })),
  bgmPrompt: z.string(),
  bgmDirection: z.string().optional(), // Story에서 가져온 BGM 방향 (우선순위 높음)
  // 기존 TTS 데이터 (재생성 시 실패한 것만 다시 생성)
  existingTts: z.array(z.object({
    id: z.string(),
    shotNumber: z.number(),
    audioUrl: z.string(), // 빈 문자열이면 재생성 필요
    duration: z.number(),
  })).optional(),
  // 기존 BGM 데이터 (재생성 시 유지)
  existingBgm: z.array(z.object({
    id: z.string(),
    url: z.string(),
    duration: z.number(),
    title: z.string().optional(),
    imageUrl: z.string().optional(),
  })).optional(),
  ttsModel: z.enum(ALLOWED_TTS_MODELS).optional(),
  bgmModel: z.enum(ALLOWED_BGM_MODELS).optional(),
})
export type AudioRequest = z.infer<typeof AudioRequestSchema>

export const ExpandRequestSchema = z.object({
  sessionId: z.string(),
  anchors: z.array(z.object({
    id: z.string(),
    category: z.enum(['character', 'background']),
    name: z.string(),
    url: z.string(),
  })),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  // front/wide는 앵커 생성 단계에서 이미 생성되므로 기본값에서 제외
  characterVariations: z.array(z.enum(['three_quarter', 'happy', 'sad'])).optional(),
  backgroundVariations: z.array(z.enum(['medium'])).optional(),
  model: z.enum(KIDS_I2I_MODELS).optional(),
})
export type ExpandRequest = z.infer<typeof ExpandRequestSchema>

export const FinalRequestSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().optional(),
  shots: z.array(z.object({
    id: z.string(),
    shotNumber: z.number().int().positive(),
    duration: z.number().positive().max(300), // Max 5 min per shot
    videoUrl: z.string().min(1), // URL or path
    audioUrl: z.string().min(1), // URL or path
  })).min(1).max(100), // At least 1, max 100 shots
  bgmUrl: z.string().min(1), // URL or path
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  // 썸네일 개선용 (optional)
  storyTitle: z.string().max(200).optional(),
  storyLogline: z.string().max(500).optional(),
  characters: z.array(z.object({
    name: z.string(),
    visualDescription: z.string(),
  })).optional(),
  anchorUrls: z.array(z.string().url()).max(10).optional(),
})
export type FinalRequest = z.infer<typeof FinalRequestSchema>

// ============================================================
// Response Types
// ============================================================

export interface StoryResponse {
  sessionId: string
  story: KidsStory
}

export interface AnchorPrompt {
  id: string
  category: 'character' | 'background'
  name: string
  prompt: string
}

export interface ScriptResponse {
  sessionId: string
  script: KidsScript
  anchorPrompts?: AnchorPrompt[]
}

export interface AnchorsResponse {
  sessionId: string
  anchors: KidsAnchor[]
  provider?: 'gemini' | 'kieai' | 'fal' | 'mock'
}

export interface ShotsResponse {
  sessionId: string
  shots: KidsShot[]
}

export interface VideosResponse {
  sessionId: string
  shots: Array<{
    id: string
    shotNumber: number
    videoUrl: string
  }>
}

export interface AudioResponse {
  sessionId: string
  tts: Array<{
    id: string
    shotNumber: number
    audioUrl: string
    duration: number
  }>
  bgmTracks: Array<{
    id: string
    url: string
    duration: number
    title?: string
    imageUrl?: string
  }>
}

export interface FinalResponse {
  sessionId: string
  videoUrl: string
  thumbnailUrl: string
  totalDuration: number
}

// ============================================================
// Step Context Types (inputContext 타입 안전성)
// ============================================================

// Re-export workflow helpers (하위 호환)
export type { ApiStepResult } from '@/lib/workflow/helpers'
export { unwrapStepResult, unwrapApiData } from '@/lib/workflow/helpers'

export interface KidsSetupData {
  topic: string
  formFactor: 'longform' | 'shortform'
  style: 'pixar' | 'disney' | 'dreamworks'
}

export interface KidsAnchorsStepData {
  mode: 'upload' | 'generate'
  files?: Array<{ id: string; file: File; preview: string; category?: 'character' | 'background' }>
  generated?: Array<{ id: string; url: string; category?: 'character' | 'background'; label?: string; dbId?: string }>
}

export interface ExpandedAnchor {
  id: string
  originalId: string
  category: 'character' | 'background'
  name: string
  variation: string
  url: string
}

export interface ExpandResponse {
  sessionId: string
  expanded: ExpandedAnchor[]
  provider?: 'gemini' | 'kieai' | 'fal' | 'mock'
  stats: { total: number; success: number; failed: number }
}

/** setup 기본값 (컨텍스트 누락 시 폴백) */
export const DEFAULT_KIDS_SETUP: KidsSetupData = {
  topic: '',
  formFactor: 'longform',
  style: 'pixar',
}

/** Kids Animation 파이프라인 전체 컨텍스트 */
export interface KidsAnimationContext {
  setup: KidsSetupData
  story: ApiStepResult<StoryResponse> | null
  script: ApiStepResult<ScriptResponse> | null
  anchors: KidsAnchorsStepData | null
  expand: ApiStepResult<ExpandResponse> | null
  shots: ApiStepResult<ShotsResponse> | null
  videos: ApiStepResult<VideosResponse> | null
  audio: ApiStepResult<AudioResponse> | null
  final: ApiStepResult<FinalResponse> | null
}

/**
 * Record<string, unknown> → Partial<KidsAnimationContext> 좁히기
 *
 * 워크플로우 시스템이 제네릭(`Record<string, unknown>`)으로 관리하는
 * inputContext를 Kids Animation 전용 타입으로 좁힌다.
 * 런타임 검증 없이 캐스트만 수행하므로, 워크플로우 내부에서만 사용해야 한다.
 * 기존 18개 개별 `as` 캐스트를 이 한 곳으로 집중시킨 의도적 설계.
 */
export function asKidsContext(ctx: Record<string, unknown> | undefined): Partial<KidsAnimationContext> {
  return (ctx ?? {}) as Partial<KidsAnimationContext>
}

// ============================================================
// Progress Event Types (for SSE)
// ============================================================

export interface ProgressEvent {
  type: 'progress' | 'complete' | 'error'
  step: string
  current: number
  total: number
  message: string
  data?: unknown
}
