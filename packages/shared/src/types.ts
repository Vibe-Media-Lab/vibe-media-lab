import { z } from 'zod'

// Media Types
export const MediaTypeSchema = z.enum(['image', 'video', 'tts', 'bgm'])
export type MediaType = z.infer<typeof MediaTypeSchema>

// Generation Status
export const GenerationStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
])
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>

// Provider Types
export const ProviderSchema = z.enum([
  'gemini',
  'openai',
  'kling',
  'elevenlabs',
  'suno',
])
export type Provider = z.infer<typeof ProviderSchema>

// Aspect Ratio
export const AspectRatioSchema = z.enum([
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
])
export type AspectRatio = z.infer<typeof AspectRatioSchema>

// Media Generation Request
export const ImageGenerationRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  aspectRatio: AspectRatioSchema.default('16:9'),
  provider: ProviderSchema.optional(),
  model: z.string().optional(),
})
export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>

export const VideoGenerationRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  imagePath: z.string().optional(),
  tailImagePath: z.string().optional(),
  duration: z.enum(['5', '10']).default('5'),
  aspectRatio: AspectRatioSchema.default('16:9'),
  provider: ProviderSchema.optional(),
})
export type VideoGenerationRequest = z.infer<typeof VideoGenerationRequestSchema>

export const TTSRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default('Rachel'),
  languageCode: z.string().default('ko'),
  speed: z.number().min(0.7).max(1.2).default(1),
})
export type TTSRequest = z.infer<typeof TTSRequestSchema>

export const BGMRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  instrumental: z.boolean().default(true),
})
export type BGMRequest = z.infer<typeof BGMRequestSchema>

// Media Generation Result
export interface MediaGenerationResult {
  id: string
  runId: string
  userId: string
  mediaType: MediaType
  prompt: string
  config: Record<string, unknown>
  provider: Provider
  model: string
  status: GenerationStatus
  outputUrl?: string
  costUsd?: number
  latencyMs?: number
  createdAt: Date
  completedAt?: Date
  error?: string
}

// Database Types
export interface User {
  id: string
  email: string
  displayName?: string
  createdAt: Date
}

export interface ApiKey {
  id: string
  provider: Provider
  keyName: string
  encryptedKey: string
  isActive: boolean
  monthlyBudgetUsd?: number
}

export interface UserCredit {
  id: string
  userId: string
  balance: number
}

// Template Types
export const TemplateCategorySchema = z.enum([
  'shortform',
  'longform',
  'music',
  'education',
  'entertainment',
  'kids',
])
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>

export const TemplateBadgeSchema = z.enum(['HOT', 'NEW', 'TRENDING'])
export type TemplateBadge = z.infer<typeof TemplateBadgeSchema>

export const TemplateDifficultySchema = z.enum(['easy', 'medium', 'hard'])
export type TemplateDifficulty = z.infer<typeof TemplateDifficultySchema>

export const TemplatePlatformSchema = z.enum([
  'tiktok',
  'instagram',
  'youtube',
  'shorts',
])
export type TemplatePlatform = z.infer<typeof TemplatePlatformSchema>

// Workflow Step Types
export const WorkflowStepTypeSchema = z.enum([
  'text-input',
  'media-upload',
  'ai-generate',
  'style-select',
  'config',
  'generation-review', // AI 생성 + 미리보기 + 승인
  'media-choice', // 업로드 OR AI 생성 선택
])
export type WorkflowStepType = z.infer<typeof WorkflowStepTypeSchema>

export interface TextInputStepConfig {
  placeholder: string
  maxLength?: number
  rows?: number
  hint?: string
}

export interface MediaUploadStepConfig {
  accept: string[]
  maxSizeMb: number
  multiple?: boolean
  hint?: string
}

export interface StyleSelectStepConfig {
  options: Array<{
    id: string
    label: string
    preview?: string
    description?: string
  }>
  multiple?: boolean
}

export interface AiGenerateStepConfig {
  mediaType: MediaType
  provider?: Provider
  autoGenerate?: boolean
  hint?: string
}

export interface ConfigStepConfig {
  fields: Array<{
    id: string
    type: 'text' | 'textarea' | 'select' | 'slider' | 'toggle'
    label: string
    placeholder?: string
    options?: Array<{ value: string; label: string; description?: string }>
    min?: number
    max?: number
    step?: number
    default?: string | number | boolean
    required?: boolean
  }>
}

// Generation Review Step: AI 생성 → 미리보기 → 승인/재생성
export interface GenerationReviewStepConfig {
  generateAction: string // API 엔드포인트 식별자 (예: 'kids/story', 'kids/script')
  outputFormat?: 'markdown' | 'json' | 'media'
  previewType:
    | 'text' // 마크다운 텍스트
    | 'shot-list' // 샷 목록 카드
    | 'image-grid' // 이미지 그리드
    | 'shot-gallery' // 샷 갤러리 (이미지 + 프롬프트)
    | 'video-timeline' // 비디오 타임라인
    | 'video-player' // 단일 비디오 플레이어
    | 'audio-player' // 오디오 플레이어
  editable?: boolean // 사용자가 결과 수정 가능 여부
  regeneratable?: boolean // 개별 항목 재생성 가능 여부
  batchSize?: number // 배치 처리 시 동시 생성 수
  subSteps?: Array<{
    id: string
    label: string
    conditional?: string // 조건부 실행 (설정 필드 참조)
  }>
  progress?: {
    show: boolean
    perItem?: boolean // 개별 항목별 진행률
    estimatedTime?: boolean // 예상 시간 표시
  }
  downloadable?: boolean // 결과 다운로드 가능 여부
}

// Media Choice Step: 업로드 OR AI 생성 선택
export interface MediaChoiceStepConfig {
  modes: Array<{
    id: 'upload' | 'generate'
    label: string
    description?: string
    default?: boolean
  }>
  uploadConfig?: {
    accept: string[]
    maxSizeMb: number
    multiple?: boolean
    categories?: string[] // 파일 분류 (예: ['character', 'background'])
  }
  generateAction?: string // AI 생성 시 API 엔드포인트
  previewType?: 'image-grid' | 'shot-gallery'
  progress?: {
    show: boolean
    perItem?: boolean
  }
}

export type WorkflowStepConfig =
  | TextInputStepConfig
  | MediaUploadStepConfig
  | StyleSelectStepConfig
  | AiGenerateStepConfig
  | ConfigStepConfig
  | GenerationReviewStepConfig
  | MediaChoiceStepConfig

export interface WorkflowStep {
  id: string
  type: WorkflowStepType
  label: string
  description?: string
  required: boolean
  config: WorkflowStepConfig
}

export interface WorkflowOutputConfig {
  aspectRatio: AspectRatio
  duration?: '5' | '10' | '30' | '60'
  format: 'mp4' | 'webm' | 'gif'
}

export interface TemplateExample {
  id: string
  thumbnail: string
  video?: string
  views?: string
}

export interface Template {
  id: string
  title: string
  description: string
  views: string
  video: string
  poster: string
  badge?: TemplateBadge
  category: TemplateCategory
  tags: string[]
  estimatedTime: string
  difficulty: TemplateDifficulty
  platforms: TemplatePlatform[]
  longDescription?: string
  workflow: {
    steps: WorkflowStep[]
    outputConfig: WorkflowOutputConfig
  }
  examples?: TemplateExample[]
  relatedTemplates?: string[]
}

// ============================================================
// Kids Animation Types
// ============================================================

// 품질 프리셋 (Legacy - 하위 호환용)
export const KidsQualityPresetSchema = z.enum(['draft', 'standard', 'premium'])
export type KidsQualityPreset = z.infer<typeof KidsQualityPresetSchema>

// 폼 팩터 (롱폼/숏폼)
export const KidsFormFactorSchema = z.enum(['longform', 'shortform'])
export type KidsFormFactor = z.infer<typeof KidsFormFactorSchema>

// 애니메이션 스타일
export const KidsAnimationStyleSchema = z.enum([
  'pixar',
  'disney',
  'dreamworks',
])
export type KidsAnimationStyle = z.infer<typeof KidsAnimationStyleSchema>

// 썸네일 스타일
export const KidsThumbnailStyleSchema = z.enum([
  'auto',
  'pixar',
  'disney',
  'dreamworks',
])
export type KidsThumbnailStyle = z.infer<typeof KidsThumbnailStyleSchema>

// 프로젝트 설정
export interface KidsProjectSetup {
  topic: string
  formFactor: KidsFormFactor
  style: KidsAnimationStyle
  songVersion: boolean
  thumbnailStyle: KidsThumbnailStyle
}

// 캐릭터 프로필 (Zootopia Protocol 기반)
export interface KidsCharacter {
  name: string
  role: 'protagonist_a' | 'protagonist_b' | 'villain' | 'supporting'
  species: string // 동물 또는 캐릭터 종류 (예: "bunny", "fox", "lion")
  personality: string // 성격 (예: "eager, idealistic")
  visualDescription: string // 비주얼 묘사 (이미지 생성용)
  goal: string // 캐릭터의 목표/욕망 (예: "최고의 요리사가 되고 싶다")
  flaw: string // 극복해야 할 약점 (예: "성급함, 남의 말을 안 듣는다")
  voiceId?: string // TTS 음성 ID
  speakingStyle?: string // 말투 스타일 (예: "energetic, fast")
}

// Act 정보 인터페이스
export interface KidsActInfo {
  title: string // 예: "꿈의 시작"
  summary?: string // 1-2문장 요약 (optional)
  narration: string // 나레이션 텍스트
  visualPrompt: string // 영어 비주얼 프롬프트
  emotion: string // 감정 (hopeful, curious, etc.)
  cameraAngle?: string // 카메라 앵글 (wide shot, close-up, medium shot, etc.)
}

// 6-Act Zootopia Protocol Plot
export interface KidsZootopiaPlot {
  hook: KidsActInfo & {
    emotion: 'hopeful' | 'curious' | 'excited' | 'peaceful'
  }
  duo: KidsActInfo & {
    emotion: 'surprised' | 'suspicious' | 'intrigued' | 'friendly'
  }
  journey: KidsActInfo & {
    emotion: 'determined' | 'adventurous' | 'struggling' | 'learning'
  }
  twist: KidsActInfo & {
    emotion: 'shocked' | 'betrayed' | 'sad' | 'confused'
  }
  action: KidsActInfo & {
    emotion: 'brave' | 'intense' | 'heroic' | 'united'
  }
  resolution: KidsActInfo & {
    emotion: 'joyful' | 'proud' | 'grateful' | 'hopeful'
  }
}

// 스토리 구조 (Enhanced with Zootopia Protocol)
export interface KidsStory {
  title: string
  logline: string // 한 문장 스토리 요약 (예: "용기 없는 토끼가 친구와 함께 두려움을 극복하는 이야기")
  lesson: string // 핵심 교훈
  synopsis: string
  characters: KidsCharacter[] // 캐릭터 프로필
  plot: KidsZootopiaPlot // 6-Act Zootopia Protocol
  setting: {
    world: string // 세계관 (예: "현대 도시", "마법의 숲")
    mainLocations: string[] // 주요 장소들 (한글)
    locationVisualDescriptions?: string[] // 장소별 시각적 설명 (영어, 이미지 생성용)
    atmosphere: string // 분위기 (예: "밝고 활기찬", "신비롭고 평화로운")
  }
  bgmDirection: string // BGM 음악적 방향 (영어, 예: "Orchestral with playful woodwinds, building to heroic brass in climax")
}

// Legacy 호환용 기본 플롯 구조
export interface KidsBasicPlot {
  opening: string // 도입
  incitingIncident: string // 발단
  risingAction: string // 전개
  climax: string // 절정
  fallingAction: string // 하강
  resolution: string // 결말
}

// Legacy 호환용 기본 스토리 구조
export interface KidsBasicStory {
  title: string
  lesson: string
  synopsis: string
  plot: KidsBasicPlot
}

// 샷 감정 타입
export type ShotEmotion =
  | 'hopeful'
  | 'curious'
  | 'excited'
  | 'peaceful'
  | 'surprised'
  | 'suspicious'
  | 'intrigued'
  | 'friendly'
  | 'determined'
  | 'adventurous'
  | 'struggling'
  | 'learning'
  | 'shocked'
  | 'betrayed'
  | 'sad'
  | 'confused'
  | 'brave'
  | 'intense'
  | 'heroic'
  | 'united'
  | 'joyful'
  | 'proud'
  | 'grateful'
  | 'neutral'

// Act Key 타입 (Zootopia Protocol)
export type ActKey = 'hook' | 'duo' | 'journey' | 'twist' | 'action' | 'resolution'

// 샷 정보 (Enhanced with emotion/voice)
export interface KidsShot {
  id: string
  shotNumber: number
  duration: 5 | 10
  narration: string
  visualPrompt: string
  // Enhanced fields (Zootopia Protocol)
  actKey?: ActKey // 어느 Act에 속하는지
  actTitle?: string // Act 제목
  emotion?: ShotEmotion // 감정
  voiceId?: string // TTS 음성 ID
  speechStyle?: string // 말투 스타일 (예: "soft and gentle", "excited and fast")
  speaker?: string // 화자 (캐릭터 이름 또는 "narrator")
  cameraMovement?: 'static' | 'pan' | 'zoom-in' | 'zoom-out' | 'tracking'
  // Media URLs
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
}

// 스크립트
export interface KidsScript {
  totalDuration: number
  shotCount: number
  shots: KidsShot[]
  bgmPrompt: string
}

// 앵커 이미지
export interface KidsAnchor {
  id: string
  category: 'character' | 'background'
  name: string
  description: string
  originalUrl?: string // 사용자 업로드
  dbId?: string // Library에 저장된 레코드 ID
  expandedUrls?: string[] // AI 확장 변형
}

// ============================================================
// Generation Progress Types (범용)
// ============================================================

export const GenerationProgressStatusSchema = z.enum([
  'idle',
  'generating',
  'completed',
  'reviewing',
  'approved',
  'failed',
])
export type GenerationProgressStatus = z.infer<
  typeof GenerationProgressStatusSchema
>

// 개별 항목 진행 상태
export interface GenerationProgressItem {
  id: string
  label: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  error?: string
}

// 전체 진행 상태
export interface GenerationProgress {
  stepId: string
  status: GenerationProgressStatus
  current: number
  total: number
  message: string
  items?: GenerationProgressItem[]
  startedAt?: Date
  estimatedEndAt?: Date
}

// 워크플로우 세션 상태
export interface WorkflowSession {
  id: string
  templateId: string
  userId: string
  currentStepIndex: number
  status: 'in_progress' | 'completed' | 'cancelled'
  stepData: Record<string, unknown> // 각 스텝의 입력/결과 데이터
  createdAt: Date
  updatedAt: Date
}

// Kids Animation 파이프라인 상태
export interface KidsPipelineState {
  sessionId: string
  projectName: string
  setup: KidsProjectSetup
  story?: KidsStory
  script?: KidsScript
  anchors?: KidsAnchor[]
  shots?: KidsShot[]
  finalVideoUrl?: string
  thumbnailUrl?: string
  songVideoUrl?: string
  progress: GenerationProgress
}
