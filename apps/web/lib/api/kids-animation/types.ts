import { z } from 'zod'
import type {
  KidsQualityPreset,
  KidsAnimationStyle,
  KidsStory,
  KidsScript,
  KidsShot,
  KidsAnchor,
} from '@vibe-media-lab/shared'

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
  anchorPrompts: z.array(z.object({
    id: z.string(),
    category: z.enum(['character', 'background']),
    name: z.string(),
    prompt: z.string(),
  })),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
})
export type AnchorsRequest = z.infer<typeof AnchorsRequestSchema>

export const ShotsRequestSchema = z.object({
  sessionId: z.string(),
  script: z.object({
    shots: z.array(z.object({
      id: z.string(),
      shotNumber: z.number(),
      duration: z.number(),
      narration: z.string(),
      visualPrompt: z.string(),
    })),
  }),
  anchors: z.array(z.object({
    id: z.string(),
    category: z.enum(['character', 'background']),
    url: z.string(),
  })),
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
})
export type ShotsRequest = z.infer<typeof ShotsRequestSchema>

// 단일 비디오 생성 요청 (클라이언트 순차 호출용)
export const VideoRequestSchema = z.object({
  sessionId: z.string(),
  shot: z.object({
    id: z.string(),
    shotNumber: z.number(),
    duration: z.number(),
    imageUrl: z.string(),
    visualPrompt: z.string(),
  }),
  formFactor: z.enum(['longform', 'shortform']).default('longform'),
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
  shots: z.array(z.object({
    id: z.string(),
    shotNumber: z.number(),
    narration: z.string(),
  })),
  bgmPrompt: z.string(),
  bgmDirection: z.string().optional(), // Story에서 가져온 BGM 방향 (우선순위 높음)
})
export type AudioRequest = z.infer<typeof AudioRequestSchema>

export const FinalRequestSchema = z.object({
  sessionId: z.string(),
  shots: z.array(z.object({
    id: z.string(),
    shotNumber: z.number().int().positive(),
    duration: z.number().positive().max(300), // Max 5 min per shot
    videoUrl: z.string().min(1), // URL or path
    audioUrl: z.string().min(1), // URL or path
  })).min(1).max(100), // At least 1, max 100 shots
  bgmUrl: z.string().min(1), // URL or path
  style: z.enum(['pixar', 'disney', 'dreamworks']).default('pixar'),
  songVersion: z.boolean().optional(),
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
  provider?: 'gemini' | 'kieai' | 'mock'
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
  songVideoUrl?: string
  totalDuration: number
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
