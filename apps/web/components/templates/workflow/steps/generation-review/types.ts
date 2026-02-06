/**
 * Generation Review Step Types
 */

import type {
  GenerationReviewStepConfig,
  GenerationProgress,
  GenerationProgressItem,
} from '@vibe-media-lab/shared'

export type StepStatus = 'idle' | 'generating' | 'reviewing' | 'approved' | 'failed'

export interface GenerationResult {
  data: unknown
  generatedAt: Date
}

export interface GenerationReviewStepProps {
  stepId: string
  label: string
  description?: string
  config: GenerationReviewStepConfig
  value: GenerationResult | null
  onChange: (value: GenerationResult | null) => void
  onApprove?: () => void
  inputContext?: Record<string, unknown>
  sessionId?: string
  projectId?: string | null
}

// Re-export from shared
export type { GenerationProgress, GenerationProgressItem, GenerationReviewStepConfig }

// Story types
export interface KidsCharacterData {
  name: string
  role: 'protagonist_a' | 'protagonist_b' | 'villain' | 'supporting'
  species: string
  personality: string
  visualDescription: string
  voiceId?: string
  speakingStyle?: string
}

export interface KidsSettingData {
  world: string
  mainLocations?: string[]
  atmosphere: string
}

export interface ZootopiaAct {
  title: string
  summary: string
  narration: string
  visualPrompt: string
  emotion: string
}

export interface KidsZootopiaPlot {
  hook?: ZootopiaAct
  duo?: ZootopiaAct
  journey?: ZootopiaAct
  twist?: ZootopiaAct
  action?: ZootopiaAct
  resolution?: ZootopiaAct
}

export interface KidsBasicPlot {
  opening?: string
  incitingIncident?: string
  risingAction?: string
  climax?: string
  fallingAction?: string
  resolution?: string
}

export interface KidsStoryData {
  title?: string
  lesson?: string
  synopsis?: string
  characters?: KidsCharacterData[]
  setting?: KidsSettingData
  plot?: KidsZootopiaPlot | KidsBasicPlot
}

// Shot types
export interface Shot {
  id: string
  shotNumber: number
  duration: number
  narration: string
  visualPrompt: string
  imageUrl?: string
  videoUrl?: string
}

export interface AnchorPrompt {
  id: string
  category: 'character' | 'background'
  name: string
  prompt: string
}

export interface ScriptData {
  script?: {
    shots?: Shot[]
    bgmPrompt?: string
  }
  shots?: Shot[]
  bgmPrompt?: string
  anchorPrompts?: AnchorPrompt[]
}

// Image types
export interface ImageItem {
  id: string
  url: string
  label?: string
  category?: 'character' | 'background'
  variation?: string
  name?: string
}

// Video types
export interface VideoItem {
  id: string
  url: string
  thumbnailUrl?: string
  duration: number
  label?: string
}

// Audio types
export interface AudioItem {
  id: string
  url: string
  label: string
  duration?: number
  isBgm?: boolean
  bgmIndex?: number
}

// Preview props
export interface PreviewProps {
  type: GenerationReviewStepConfig['previewType']
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
  onRegenerateItem?: (itemId: string) => void
  onLikeItem?: (itemId: string, url: string) => void
  onDownloadItem?: (itemId: string, url: string) => void
  selectedBgmIndex?: number
  onSelectBgm?: (index: number) => void
  // 오디오 재생성 선택 기능
  regenerateMode?: boolean
  selectedForRegenerate?: Set<string>
  onToggleRegenerate?: (id: string, isBgm: boolean) => void
}
