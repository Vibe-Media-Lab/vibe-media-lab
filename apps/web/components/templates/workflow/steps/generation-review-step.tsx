'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import type {
  GenerationReviewStepConfig,
  GenerationProgress,
  GenerationProgressItem,
} from '@vibe-media-lab/shared'

// ============================================================
// Types
// ============================================================

type StepStatus = 'idle' | 'generating' | 'reviewing' | 'approved' | 'failed'

interface GenerationResult {
  data: unknown
  generatedAt: Date
}

interface GenerationReviewStepProps {
  stepId: string
  label: string
  description?: string
  config: GenerationReviewStepConfig
  value: GenerationResult | null
  onChange: (value: GenerationResult | null) => void
  onApprove?: () => void
  inputContext?: Record<string, unknown>
  sessionId?: string
}

// ============================================================
// Progress Display Component
// ============================================================

interface ProgressDisplayProps {
  progress: GenerationProgress
  showPerItem?: boolean
}

function ProgressDisplay({ progress, showPerItem }: ProgressDisplayProps) {
  const percentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/80">{progress.message}</span>
          <span className="text-white/60">
            {progress.current}/{progress.total}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Per-item Progress */}
      {showPerItem && progress.items && progress.items.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {progress.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1 text-center"
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                  item.status === 'completed' &&
                    'bg-[var(--color-neon-lime)]/20 text-[var(--color-neon-lime)]',
                  item.status === 'processing' &&
                    'animate-pulse bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]',
                  item.status === 'pending' && 'bg-white/10 text-white/40',
                  item.status === 'failed' && 'bg-red-500/20 text-red-500'
                )}
              >
                {item.status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : item.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : item.status === 'failed' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  item.label.slice(0, 2)
                )}
              </div>
              <span className="text-[10px] text-white/60">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Estimated Time */}
      {progress.estimatedEndAt && (
        <p className="text-center text-xs text-white/40">
          예상 완료:{' '}
          {new Date(progress.estimatedEndAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  )
}

// ============================================================
// Preview Components
// ============================================================

interface PreviewProps {
  type: GenerationReviewStepConfig['previewType']
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
  onRegenerateItem?: (itemId: string) => void
}

// Format story object to markdown (supports both legacy and enhanced Zootopia format)
function formatStoryToMarkdown(storyResponse: unknown): string {
  // Unwrap nested API response: { success, data: { sessionId, story }, meta }
  let unwrapped = storyResponse as Record<string, unknown>

  // Handle { success, data: {...} } wrapper from API handler
  if (unwrapped && typeof unwrapped === 'object' && 'success' in unwrapped && 'data' in unwrapped) {
    unwrapped = unwrapped.data as Record<string, unknown>
  }

  // Handle { sessionId, story } structure
  const response = unwrapped as { story?: KidsStoryData } | KidsStoryData
  const story = response && 'story' in response ? response.story : (response as KidsStoryData)

  if (!story || typeof story !== 'object') {
    return typeof storyResponse === 'string'
      ? storyResponse
      : JSON.stringify(storyResponse, null, 2)
  }

  // Check if it's enhanced Zootopia format
  const plot = story.plot
  const isEnhanced =
    story.characters &&
    Array.isArray(story.characters) &&
    plot &&
    'hook' in plot

  if (isEnhanced && plot) {
    // Enhanced Zootopia Protocol format
    const zootopiaPlot = plot as KidsZootopiaPlot

    let charactersSection = ''
    if (story.characters && story.characters.length > 0) {
      charactersSection = `\n## 캐릭터\n${story.characters
        .map(
          (c) =>
            `### ${c.name} (${c.role === 'protagonist_a' ? '주인공' : c.role === 'protagonist_b' ? '파트너' : c.role === 'villain' ? '적대자' : '조연'})\n- **종류**: ${c.species}\n- **성격**: ${c.personality}\n- **외형**: ${c.visualDescription}`
        )
        .join('\n\n')}`
    }

    let settingSection = ''
    if (story.setting) {
      settingSection = `\n## 세계관\n- **배경**: ${story.setting.world}\n- **주요 장소**: ${story.setting.mainLocations?.join(', ') || ''}\n- **분위기**: ${story.setting.atmosphere}`
    }

    return `# ${story.title || '제목 없음'}

## 교훈
${story.lesson || ''}

## 줄거리
${story.synopsis || ''}
${charactersSection}
${settingSection}

## 6-Act 스토리 구조

### 🌟 Act 1: ${zootopiaPlot.hook?.title || 'Hook'}
**감정**: ${zootopiaPlot.hook?.emotion || 'hopeful'}
${zootopiaPlot.hook?.narration || ''}

### 🤝 Act 2: ${zootopiaPlot.duo?.title || 'Duo'}
**감정**: ${zootopiaPlot.duo?.emotion || 'surprised'}
${zootopiaPlot.duo?.narration || ''}

### 🚀 Act 3: ${zootopiaPlot.journey?.title || 'Journey'}
**감정**: ${zootopiaPlot.journey?.emotion || 'adventurous'}
${zootopiaPlot.journey?.narration || ''}

### ⚡ Act 4: ${zootopiaPlot.twist?.title || 'Twist'}
**감정**: ${zootopiaPlot.twist?.emotion || 'sad'}
${zootopiaPlot.twist?.narration || ''}

### 💪 Act 5: ${zootopiaPlot.action?.title || 'Action'}
**감정**: ${zootopiaPlot.action?.emotion || 'brave'}
${zootopiaPlot.action?.narration || ''}

### 🎉 Act 6: ${zootopiaPlot.resolution?.title || 'Resolution'}
**감정**: ${zootopiaPlot.resolution?.emotion || 'joyful'}
${zootopiaPlot.resolution?.narration || ''}`
  }

  // Legacy format
  const legacyPlot = story.plot as KidsBasicPlot | undefined

  return `# ${story.title || '제목 없음'}

## 교훈
${story.lesson || ''}

## 줄거리
${story.synopsis || ''}

### 1. 도입
${legacyPlot?.opening || ''}

### 2. 발단
${legacyPlot?.incitingIncident || ''}

### 3. 전개
${legacyPlot?.risingAction || ''}

### 4. 절정
${legacyPlot?.climax || ''}

### 5. 하강
${legacyPlot?.fallingAction || ''}

### 6. 결말
${legacyPlot?.resolution || ''}`
}

// Character type for enhanced stories
interface KidsCharacterData {
  name: string
  role: 'protagonist_a' | 'protagonist_b' | 'villain' | 'supporting'
  species: string
  personality: string
  visualDescription: string
  voiceId?: string
  speakingStyle?: string
}

// Setting type for enhanced stories
interface KidsSettingData {
  world: string
  mainLocations?: string[]
  atmosphere: string
}

// Zootopia Act type
interface ZootopiaAct {
  title: string
  summary: string
  narration: string
  visualPrompt: string
  emotion: string
}

// Enhanced Zootopia plot type
interface KidsZootopiaPlot {
  hook?: ZootopiaAct
  duo?: ZootopiaAct
  journey?: ZootopiaAct
  twist?: ZootopiaAct
  action?: ZootopiaAct
  resolution?: ZootopiaAct
}

// Legacy basic plot type
interface KidsBasicPlot {
  opening?: string
  incitingIncident?: string
  risingAction?: string
  climax?: string
  fallingAction?: string
  resolution?: string
}

interface KidsStoryData {
  title?: string
  lesson?: string
  synopsis?: string
  characters?: KidsCharacterData[]
  setting?: KidsSettingData
  plot?: KidsZootopiaPlot | KidsBasicPlot
}

function TextPreview({
  data,
  editable,
  onEdit,
}: {
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const formattedData = formatStoryToMarkdown(data)
  const [editedData, setEditedData] = React.useState(formattedData)

  React.useEffect(() => {
    setEditedData(formatStoryToMarkdown(data))
  }, [data])

  const handleSave = () => {
    // For now, just close editing - in future could parse back to object
    onEdit?.(editedData)
    setIsEditing(false)
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/60">스토리</span>
        {editable && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-white/60 hover:text-white"
          >
            <Edit3 className="mr-1 h-3 w-3" />
            수정
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editedData}
            onChange={(e) => setEditedData(e.target.value)}
            className={cn(
              'min-h-[200px] w-full rounded-lg border border-white/30',
              'bg-white/5 p-4 text-sm text-white',
              'focus:border-[var(--color-neon-pink)] focus:outline-none'
            )}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditedData(formattedData)
                setIsEditing(false)
              }}
              className="border-white/30 bg-transparent text-white"
            >
              취소
            </Button>
            <Button size="sm" onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'max-h-[400px] overflow-y-auto rounded-lg',
            'bg-white/5 p-4 text-sm leading-relaxed text-white/80'
          )}
        >
          <pre className="whitespace-pre-wrap font-sans">{formattedData}</pre>
        </div>
      )}
    </div>
  )
}

interface Shot {
  id: string
  shotNumber: number
  duration: number
  narration: string
  visualPrompt: string
  imageUrl?: string
  videoUrl?: string
}

interface AnchorPrompt {
  id: string
  category: 'character' | 'background'
  name: string
  prompt: string
}

interface ScriptData {
  script?: {
    shots?: Shot[]
    bgmPrompt?: string
  }
  shots?: Shot[]
  bgmPrompt?: string
  anchorPrompts?: AnchorPrompt[]
}

function ShotListPreview({
  data,
  editable,
  onEdit,
}: {
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
}) {
  const [expandedShot, setExpandedShot] = React.useState<string | null>(null)
  const [editingField, setEditingField] = React.useState<{
    type: 'shot' | 'anchor' | 'bgm'
    id: string
    field: string
  } | null>(null)
  const [editValue, setEditValue] = React.useState('')

  // Extract data from API response format
  // Handle wrapped format: { success, data: { sessionId, script: { shots } } }
  let unwrapped = data as Record<string, unknown>
  if (unwrapped && typeof unwrapped === 'object' && 'success' in unwrapped && 'data' in unwrapped) {
    unwrapped = unwrapped.data as Record<string, unknown>
  }
  const response = unwrapped as ScriptData
  const shots = response?.script?.shots || response?.shots || []
  const bgmPrompt = response?.script?.bgmPrompt || response?.bgmPrompt || ''
  const anchorPrompts = response?.anchorPrompts || []

  const startEditing = (type: 'shot' | 'anchor' | 'bgm', id: string, field: string, currentValue: string) => {
    setEditingField({ type, id, field })
    setEditValue(currentValue)
  }

  const saveEdit = () => {
    if (!editingField || !onEdit) return

    // Create updated data
    const updatedData = JSON.parse(JSON.stringify(unwrapped))
    const targetShots = updatedData.script?.shots || updatedData.shots || []
    const targetAnchors = updatedData.anchorPrompts || []

    if (editingField.type === 'shot') {
      const shotIndex = targetShots.findIndex((s: Shot) => s.id === editingField.id)
      if (shotIndex !== -1) {
        targetShots[shotIndex][editingField.field] = editValue
      }
    } else if (editingField.type === 'anchor') {
      const anchorIndex = targetAnchors.findIndex((a: AnchorPrompt) => a.id === editingField.id)
      if (anchorIndex !== -1) {
        targetAnchors[anchorIndex].prompt = editValue
      }
    } else if (editingField.type === 'bgm') {
      if (updatedData.script) {
        updatedData.script.bgmPrompt = editValue
      } else {
        updatedData.bgmPrompt = editValue
      }
    }

    onEdit(updatedData)
    setEditingField(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  return (
    <div className="w-full space-y-4">
      {/* Anchor Prompts Section */}
      {anchorPrompts.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-white/60">
            앵커 이미지 프롬프트 ({anchorPrompts.length}개)
          </span>
          <div className="space-y-2">
            {anchorPrompts.map((anchor) => (
              <div
                key={anchor.id}
                className="rounded-lg border border-white/20 bg-white/5 p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      anchor.category === 'character'
                        ? 'bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]'
                        : 'bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)]'
                    )}
                  >
                    {anchor.category === 'character' ? '캐릭터' : '배경'}
                  </span>
                  <span className="text-sm font-medium text-white">{anchor.name}</span>
                </div>
                {editingField?.type === 'anchor' && editingField.id === anchor.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                        취소
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'text-sm text-white/60',
                      editable && 'cursor-pointer hover:text-white/80'
                    )}
                    onClick={() => editable && startEditing('anchor', anchor.id, 'prompt', anchor.prompt)}
                  >
                    {anchor.prompt}
                    {editable && (
                      <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shots Section */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-white/60">
          샷 스크립트 ({shots.length}샷)
        </span>
        <div className="space-y-2">
          {shots.map((shot) => (
            <div
              key={shot.id}
              className={cn(
                'rounded-lg border border-white/20 bg-white/5',
                'overflow-hidden transition-all'
              )}
            >
              <button
                onClick={() =>
                  setExpandedShot(expandedShot === shot.id ? null : shot.id)
                }
                className="flex w-full items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      'bg-[var(--color-neon-pink)]/20 text-sm font-medium text-[var(--color-neon-pink)]'
                    )}
                  >
                    {shot.shotNumber}
                  </span>
                  <div>
                    <p className="text-sm text-white">
                      {shot.narration.slice(0, 50)}
                      {shot.narration.length > 50 && '...'}
                    </p>
                    <p className="text-xs text-white/40">{shot.duration}초</p>
                  </div>
                </div>
                {expandedShot === shot.id ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </button>
              {expandedShot === shot.id && (
                <div className="border-t border-white/10 p-3 space-y-3">
                  {/* Narration */}
                  <div>
                    <span className="text-xs text-white/40">나레이션</span>
                    {editingField?.type === 'shot' && editingField.id === shot.id && editingField.field === 'narration' ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                            취소
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          'mt-1 text-sm text-white/80',
                          editable && 'cursor-pointer hover:text-white'
                        )}
                        onClick={() => editable && startEditing('shot', shot.id, 'narration', shot.narration)}
                      >
                        {shot.narration}
                        {editable && <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />}
                      </p>
                    )}
                  </div>
                  {/* Visual Prompt */}
                  <div>
                    <span className="text-xs text-white/40">비주얼 프롬프트</span>
                    {editingField?.type === 'shot' && editingField.id === shot.id && editingField.field === 'visualPrompt' ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                            취소
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          'mt-1 text-sm text-white/60',
                          editable && 'cursor-pointer hover:text-white/80'
                        )}
                        onClick={() => editable && startEditing('shot', shot.id, 'visualPrompt', shot.visualPrompt)}
                      >
                        {shot.visualPrompt}
                        {editable && <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BGM Prompt Section */}
      {bgmPrompt && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-white/60">BGM 프롬프트</span>
          <div className="rounded-lg border border-white/20 bg-white/5 p-3">
            {editingField?.type === 'bgm' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                    취소
                  </Button>
                  <Button size="sm" onClick={saveEdit}>
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  'text-sm text-white/60',
                  editable && 'cursor-pointer hover:text-white/80'
                )}
                onClick={() => editable && startEditing('bgm', 'bgm', 'bgmPrompt', bgmPrompt)}
              >
                {bgmPrompt}
                {editable && <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ImageItem {
  id: string
  url: string
  label?: string
  category?: 'character' | 'background'
  variation?: string
  name?: string
}

function ImageGridPreview({
  data,
  onRegenerateItem,
}: {
  data: unknown
  onRegenerateItem?: (id: string) => void
}) {
  // Unwrap API response format
  let unwrapped = data as Record<string, unknown>
  if (unwrapped && typeof unwrapped === 'object' && 'success' in unwrapped && 'data' in unwrapped) {
    unwrapped = unwrapped.data as Record<string, unknown>
  }

  // Extract items from various response formats
  const response = unwrapped as {
    expanded?: ImageItem[]
    anchors?: ImageItem[]
    images?: ImageItem[]
  }
  const items: ImageItem[] = response?.expanded || response?.anchors || response?.images || (Array.isArray(data) ? data as ImageItem[] : [])

  // Group by category if available
  const characterItems = items.filter((i) => i.category === 'character')
  const backgroundItems = items.filter((i) => i.category === 'background')
  const otherItems = items.filter((i) => !i.category)

  const renderImageGrid = (gridItems: ImageItem[], title?: string) => (
    <div className="space-y-2">
      {title && (
        <span className="text-xs font-medium text-white/40">{title}</span>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {gridItems.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-white/10"
          >
            {item.url ? (
              <img
                src={item.url}
                alt={item.label || item.name || item.id}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center">
              {item.name && (
                <div className="text-xs font-medium text-white">{item.name}</div>
              )}
              {item.variation && (
                <div className="text-[10px] text-white/60">{item.variation}</div>
              )}
              {item.label && !item.name && (
                <div className="text-xs text-white">{item.label}</div>
              )}
            </div>
            {onRegenerateItem && (
              <button
                onClick={() => onRegenerateItem(item.id)}
                className={cn(
                  'absolute right-2 top-2 rounded-full bg-black/60 p-1.5',
                  'opacity-0 transition-opacity group-hover:opacity-100'
                )}
              >
                <RotateCcw className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const hasCategories = characterItems.length > 0 || backgroundItems.length > 0

  return (
    <div className="w-full space-y-4">
      <span className="text-sm font-medium text-white/60">
        이미지 ({items.length}개)
      </span>
      {hasCategories ? (
        <>
          {characterItems.length > 0 && renderImageGrid(characterItems, `캐릭터 (${characterItems.length})`)}
          {backgroundItems.length > 0 && renderImageGrid(backgroundItems, `배경 (${backgroundItems.length})`)}
        </>
      ) : (
        renderImageGrid(otherItems)
      )}
    </div>
  )
}

function ShotGalleryPreview({
  data,
  onRegenerateItem,
}: {
  data: unknown
  onRegenerateItem?: (id: string) => void
}) {
  // Extract shots from API response format
  // Handle wrapped format: { success, data: { shots } } or { shots }
  let unwrapped = data as Record<string, unknown>
  if (unwrapped && typeof unwrapped === 'object' && 'success' in unwrapped && 'data' in unwrapped) {
    unwrapped = unwrapped.data as Record<string, unknown>
  }
  const shots: Shot[] = (unwrapped?.shots as Shot[]) || (Array.isArray(data) ? data as Shot[] : [])

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        샷 갤러리 ({shots.length}샷)
      </span>
      <div className="grid gap-4 sm:grid-cols-2">
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="group overflow-hidden rounded-lg border border-white/20 bg-white/5"
          >
            <div className="relative aspect-video bg-white/10">
              {shot.imageUrl ? (
                <img
                  src={shot.imageUrl}
                  alt={`Shot ${shot.shotNumber}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white/20" />
                </div>
              )}
              <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                #{shot.shotNumber} · {shot.duration}초
              </div>
              {onRegenerateItem && (
                <button
                  onClick={() => onRegenerateItem(shot.id)}
                  className={cn(
                    'absolute right-2 top-2 rounded-full bg-black/60 p-1.5',
                    'opacity-0 transition-opacity group-hover:opacity-100'
                  )}
                >
                  <RotateCcw className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm text-white/80 line-clamp-2">
                {shot.narration}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface VideoItem {
  id: string
  url: string
  thumbnailUrl?: string
  duration: number
  label?: string
}

function VideoTimelinePreview({
  data,
  onRegenerateItem,
}: {
  data: VideoItem[]
  onRegenerateItem?: (id: string) => void
}) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({})

  const handlePlayPause = (id: string) => {
    const video = videoRefs.current[id]
    if (!video) return

    if (playingId === id) {
      video.pause()
      setPlayingId(null)
    } else {
      // Pause other videos
      Object.values(videoRefs.current).forEach((v) => v?.pause())
      video.play()
      setPlayingId(id)
    }
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        비디오 타임라인 ({data.length}개)
      </span>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {data.map((item) => (
          <div
            key={item.id}
            className="group relative flex-shrink-0 overflow-hidden rounded-lg"
            style={{ width: `${Math.max(80, item.duration * 15)}px` }}
          >
            <div className="relative aspect-video bg-white/10">
              {item.url ? (
                <video
                  ref={(el) => {
                    videoRefs.current[item.id] = el
                  }}
                  src={item.url}
                  poster={item.thumbnailUrl}
                  className="h-full w-full object-cover"
                  onEnded={() => setPlayingId(null)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                </div>
              )}
              {item.url && (
                <button
                  onClick={() => handlePlayPause(item.id)}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    'bg-black/40 transition-opacity',
                    playingId === item.id
                      ? 'opacity-0 hover:opacity-100'
                      : 'opacity-100'
                  )}
                >
                  {playingId === item.id ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white" />
                  )}
                </button>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
              {item.duration}초
            </div>
            {onRegenerateItem && (
              <button
                onClick={() => onRegenerateItem(item.id)}
                className={cn(
                  'absolute right-1 top-1 rounded-full bg-black/60 p-1',
                  'opacity-0 transition-opacity group-hover:opacity-100'
                )}
              >
                <RotateCcw className="h-2.5 w-2.5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoPlayerPreview({ data }: { data: { url: string } }) {
  return (
    <div className="w-full space-y-2">
      <span className="text-sm font-medium text-white/60">최종 영상</span>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        {data.url ? (
          <video
            src={data.url}
            controls
            className="h-full w-full"
            poster={`https://picsum.photos/seed/${Date.now()}/1280/720`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        )}
      </div>
    </div>
  )
}

interface AudioItem {
  id: string
  url: string
  label: string
  duration?: number
}

function AudioPlayerPreview({ data }: { data: AudioItem[] }) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({})

  const handlePlayPause = (id: string) => {
    const audio = audioRefs.current[id]
    if (!audio) return

    if (playingId === id) {
      audio.pause()
      setPlayingId(null)
    } else {
      Object.values(audioRefs.current).forEach((a) => a?.pause())
      audio.play()
      setPlayingId(id)
    }
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        오디오 ({data.length}개)
      </span>
      <div className="space-y-2">
        {data.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 p-3"
          >
            <button
              onClick={() => handlePlayPause(item.id)}
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                'bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]'
              )}
            >
              {playingId === item.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{item.label}</p>
              {item.duration && (
                <p className="text-xs text-white/40">
                  {Math.floor(item.duration / 60)}:
                  {String(item.duration % 60).padStart(2, '0')}
                </p>
              )}
            </div>
            <Volume2 className="h-4 w-4 text-white/40" />
            <audio
              ref={(el) => {
                audioRefs.current[item.id] = el
              }}
              src={item.url}
              onEnded={() => setPlayingId(null)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Preview({ type, data, editable, onEdit, onRegenerateItem }: PreviewProps) {
  switch (type) {
    case 'text':
      return (
        <TextPreview
          data={data}
          editable={editable}
          onEdit={onEdit}
        />
      )
    case 'shot-list':
      return (
        <ShotListPreview data={data} editable={editable} onEdit={onEdit} />
      )
    case 'image-grid':
      return (
        <ImageGridPreview
          data={data}
          onRegenerateItem={onRegenerateItem}
        />
      )
    case 'shot-gallery':
      return (
        <ShotGalleryPreview
          data={data}
          onRegenerateItem={onRegenerateItem}
        />
      )
    case 'video-timeline':
      return (
        <VideoTimelinePreview
          data={data as VideoItem[]}
          onRegenerateItem={onRegenerateItem}
        />
      )
    case 'video-player':
      return <VideoPlayerPreview data={data as { url: string }} />
    case 'audio-player':
      return <AudioPlayerPreview data={data as AudioItem[]} />
    default:
      return (
        <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
          Unknown preview type: {type}
        </div>
      )
  }
}

// ============================================================
// Main Component
// ============================================================

export function GenerationReviewStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
  onApprove,
  inputContext,
  sessionId,
}: GenerationReviewStepProps) {
  const [status, setStatus] = React.useState<StepStatus>(
    value ? 'reviewing' : 'idle'
  )
  const [progress, setProgress] = React.useState<GenerationProgress>({
    stepId,
    status: 'idle',
    current: 0,
    total: 0,
    message: '',
  })
  const [error, setError] = React.useState<string | null>(null)

  // Reset status when stepId changes (switching between steps)
  React.useEffect(() => {
    setStatus(value ? 'reviewing' : 'idle')
    setError(null)
    setProgress({
      stepId,
      status: 'idle',
      current: 0,
      total: 0,
      message: '',
    })
  }, [stepId, value])

  // Helper to unwrap API response: { success, data: { ... }, meta } -> { ... }
  const unwrapApiResponse = <T,>(stepData: { data?: { success?: boolean; data?: T } } | undefined): T | undefined => {
    const apiResponse = stepData?.data
    if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse && 'data' in apiResponse) {
      return apiResponse.data as T
    }
    return apiResponse as T | undefined
  }

  // Build API request body from input context
  const buildRequestBody = (): Record<string, unknown> => {
    const setupData = (inputContext?.setup as Record<string, unknown>) || {}

    // Unwrap nested API responses: { data: { success, data: { sessionId, story } } } -> { sessionId, story }
    const storyResponse = unwrapApiResponse<{ story?: unknown; sessionId?: string }>(
      inputContext?.story as { data?: { success?: boolean; data?: { story?: unknown; sessionId?: string } } }
    )
    const scriptResponse = unwrapApiResponse<{ script?: unknown; sessionId?: string }>(
      inputContext?.script as { data?: { success?: boolean; data?: { script?: unknown; sessionId?: string } } }
    )
    const anchorsStepData = inputContext?.anchors as {
      generated?: Array<{
        id: string
        url: string
        category?: 'character' | 'background'
        label?: string
      }>
    } | undefined
    const shotsResponse = unwrapApiResponse<{ shots?: unknown[] }>(
      inputContext?.shots as { data?: { success?: boolean; data?: { shots?: unknown[] } } }
    )

    // Extract data from unwrapped responses
    const story = storyResponse?.story
    const script = scriptResponse?.script
    const anchors = anchorsStepData?.generated?.map((a) => ({
      id: a.id,
      url: a.url,
      category: a.category,
      name: a.label,
    })) || []
    const shots = shotsResponse?.shots

    // Base request with session ID
    const baseRequest = {
      sessionId: sessionId || storyResponse?.sessionId || `session-${Date.now()}`,
      topic: setupData.topic,
      formFactor: setupData.formFactor || 'longform',
      style: setupData.style || 'pixar',
    }

    // Add step-specific data based on generateAction
    switch (config.generateAction) {
      case 'kids/story':
        return baseRequest

      case 'kids/script':
        return {
          ...baseRequest,
          story,
        }

      case 'kids/expand':
        // 앵커 이미지를 확장 API에 전달 (실제 카테고리 정보 사용)
        return {
          ...baseRequest,
          anchors: anchors.map((a) => ({
            id: a.id || `anchor-${anchors.indexOf(a) + 1}`,
            category: a.category || 'character',
            name: a.name || `Anchor`,
            url: a.url,
          })),
        }

      case 'kids/shots':
        // expanded 이미지 포함
        const expandedData = unwrapApiResponse<{ expanded?: unknown[] }>(
          inputContext?.expand as { data?: { success?: boolean; data?: { expanded?: unknown[] } } }
        )
        return {
          ...baseRequest,
          script,
          anchors,
          expanded: expandedData?.expanded || [],
        }

      case 'kids/videos':
        // Also unwrap current step's value if needed
        const currentValueShots = unwrapApiResponse<{ shots?: unknown[] }>(
          value as { data?: { success?: boolean; data?: { shots?: unknown[] } } }
        )?.shots
        return {
          ...baseRequest,
          shots: shots || currentValueShots || [],
        }

      case 'kids/audio':
        return {
          ...baseRequest,
          shots: shots || [],
          bgmPrompt: (script as { bgmPrompt?: string })?.bgmPrompt || '',
        }

      default:
        return baseRequest
    }
  }

  // Get API endpoint from generateAction
  const getApiEndpoint = (): string => {
    const actionMap: Record<string, string> = {
      'kids/story': '/api/kids-animation/story',
      'kids/script': '/api/kids-animation/script',
      'kids/expand': '/api/kids-animation/expand',
      'kids/shots': '/api/kids-animation/shots',
      'kids/videos': '/api/kids-animation/videos',
      'kids/audio': '/api/kids-animation/audio',
      'kids/final': '/api/kids-animation/final',
    }
    return actionMap[config.generateAction || ''] || ''
  }

  // Call actual API for generation
  const handleGenerate = async () => {
    setStatus('generating')
    setError(null)

    const total = config.batchSize || 1
    const items: GenerationProgressItem[] = config.batchSize
      ? Array.from({ length: total }, (_, i) => ({
          id: `item-${i + 1}`,
          label: `#${i + 1}`,
          status: 'pending' as const,
        }))
      : []

    setProgress({
      stepId,
      status: 'generating',
      current: 0,
      total,
      message: '생성 준비 중...',
      items,
    })

    try {
      const endpoint = getApiEndpoint()
      const requestBody = buildRequestBody()

      // If we have an API endpoint, call it
      if (endpoint) {
        setProgress((prev) => ({
          ...prev,
          message: 'API 호출 중...',
        }))

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `API 오류: ${response.status}`)
        }

        const result = await response.json()

        // Store raw API response for subsequent steps
        // The display formatting is handled in Preview components
        onChange({
          data: result,
          generatedAt: new Date(),
        })
        setStatus('reviewing')
        return
      }

      // Fallback to mock generation if no endpoint
      await mockGenerate(total, items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다')
      setStatus('failed')
    }
  }

  // Mock generation for development/testing
  const mockGenerate = async (total: number, items: GenerationProgressItem[]) => {
    for (let i = 0; i < total; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const updatedItems = items.map((item, idx) => ({
        ...item,
        status:
          idx < i + 1
            ? ('completed' as const)
            : idx === i + 1
              ? ('processing' as const)
              : ('pending' as const),
      }))

      setProgress({
        stepId,
        status: 'generating',
        current: i + 1,
        total,
        message: `생성 중... (${i + 1}/${total})`,
        items: updatedItems,
      })
    }

    // Get setup data for mock
    const setupData = (inputContext?.setup as Record<string, unknown>) || {}
    const topic = (setupData.topic as string) || '손씻기'

    // Mock result based on preview type
    let mockData: unknown

    switch (config.previewType) {
      case 'text':
        mockData = `# ${topic}의 대모험

## 교훈
${topic}의 중요성을 배우는 이야기

## 줄거리
${topic}을(를) 싫어하는 꼬마가 마법의 세계에서 모험을 떠난다...

### 1. 도입
평화로운 마을에 사는 주인공 "꼬미"는 ${topic}을(를) 싫어하는 아이였어요.

### 2. 발단
어느 날, 꼬미가 ${topic}을(를) 하지 않아서 마법의 세계로 빨려 들어가게 되었어요.

### 3. 전개
마법의 세계에서 꼬미는 친구 "버블"과 "드롭"을 만나요.

### 4. 절정
마침내 거대한 적과 마주한 꼬미! 친구들과 함께 ${topic}의 힘으로 적을 물리칩니다.

### 5. 하강
적을 물리친 후, 꼬미는 ${topic}이(가) 얼마나 중요한지 깨닫게 되었어요.

### 6. 결말
집으로 돌아온 꼬미는 매일 ${topic}을(를) 열심히 하는 아이가 되었어요.`
        break

      case 'shot-list':
        mockData = {
          shots: Array.from({ length: 5 }, (_, i) => ({
            id: `shot-${i + 1}`,
            shotNumber: i + 1,
            duration: i % 2 === 0 ? 5 : 10,
            narration: `샷 ${i + 1}: ${topic}에 관한 장면입니다.`,
            visualPrompt: `A colorful Pixar-style scene about ${topic}...`,
          })),
        }
        break

      case 'image-grid':
      case 'shot-gallery':
        mockData = Array.from({ length: total }, (_, i) => ({
          id: `shot-${i + 1}`,
          shotNumber: i + 1,
          duration: 5,
          narration: `샷 ${i + 1}: ${topic} 장면`,
          visualPrompt: `Visual prompt for ${topic} shot ${i + 1}`,
          imageUrl: `https://picsum.photos/seed/${Date.now() + i}/800/450`,
        }))
        break

      case 'video-timeline':
        mockData = Array.from({ length: total }, (_, i) => ({
          id: `video-${i + 1}`,
          url: '',
          thumbnailUrl: `https://picsum.photos/seed/${Date.now() + i}/160/90`,
          duration: i % 2 === 0 ? 5 : 10,
          label: `Shot ${i + 1}`,
        }))
        break

      case 'video-player':
        mockData = { url: '' }
        break

      case 'audio-player':
        mockData = [
          { id: 'tts', url: '', label: '나레이션', duration: 60 },
          { id: 'bgm', url: '', label: 'BGM', duration: 90 },
        ]
        break

      default:
        mockData = {}
    }

    onChange({
      data: mockData,
      generatedAt: new Date(),
    })
    setStatus('reviewing')
  }

  const handleRegenerate = () => {
    onChange(null)
    handleGenerate()
  }

  const handleRegenerateItem = async (_itemId: string) => {
    // TODO: Implement individual item regeneration
  }

  const handleApprove = () => {
    setStatus('approved')
    onApprove?.()
  }

  const handleEdit = (editedData: unknown) => {
    if (value) {
      onChange({
        ...value,
        data: editedData,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Label className="text-base font-medium text-white">{label}</Label>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
      </div>

      {/* Content Area */}
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-xl p-6',
          'border-2 border-dashed border-white/30 bg-white/5',
          status === 'reviewing' && 'border-solid'
        )}
      >
        {/* Idle State */}
        {status === 'idle' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-pink)]/20 to-[var(--color-neon-cyan)]/20">
              <Sparkles className="h-8 w-8 text-[var(--color-neon-pink)]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white">AI 생성 준비</p>
              <p className="mt-1 text-sm text-white/60">
                버튼을 클릭하면 AI가 콘텐츠를 생성합니다
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-neon-pink)]/30"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              생성 시작
            </Button>
          </>
        )}

        {/* Generating State */}
        {status === 'generating' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[var(--color-neon-pink)]" />
            <ProgressDisplay
              progress={progress}
              showPerItem={config.progress?.perItem}
            />
          </>
        )}

        {/* Reviewing State */}
        {status === 'reviewing' && value && (
          <div className="w-full space-y-4">
            <Preview
              type={config.previewType}
              data={value.data}
              editable={config.editable}
              onEdit={handleEdit}
              onRegenerateItem={
                config.regeneratable ? handleRegenerateItem : undefined
              }
            />

            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                재생성
              </Button>
              <Button
                onClick={handleApprove}
                className="bg-gradient-to-r from-[var(--color-neon-lime)] to-[var(--color-neon-cyan)]"
              >
                다음 단계
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Approved State */}
        {status === 'approved' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neon-lime)]/20">
              <Check className="h-8 w-8 text-[var(--color-neon-lime)]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white">승인 완료</p>
              <p className="mt-1 text-sm text-white/60">
                다음 단계로 진행합니다
              </p>
            </div>
          </>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-red-500">생성 실패</p>
              <p className="mt-1 text-sm text-white/60">
                {error || '다시 시도해주세요'}
              </p>
            </div>
            <Button onClick={handleGenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </>
        )}
      </div>

      {/* Sub-steps indicator */}
      {config.subSteps && config.subSteps.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          {config.subSteps.map((subStep, idx) => (
            <React.Fragment key={subStep.id}>
              <span className="text-xs text-white/40">{subStep.label}</span>
              {idx < config.subSteps!.length - 1 && (
                <span className="text-white/20">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
