'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Upload,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
  X,
  ImagePlus,
  Heart,
  Download,
} from 'lucide-react'
import { ImageGridSkeleton } from './generation-review/skeletons'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import type {
  MediaChoiceStepConfig,
  GenerationProgress,
  GenerationProgressItem,
} from '@vibe-media-lab/shared'
import {
  DEFAULT_KIDS_SETUP,
  asKidsContext,
  unwrapStepResult,
} from '@/lib/api/kids-animation/types'
import { WorkflowModelPopup } from './generation-review/workflow-model-popup'
import { useWorkflowStore } from '@/lib/stores/workflow-store'
import { getAction } from '@/lib/step-actions/registry'
import type { StepActionContext, StepCallbacks } from '@/lib/step-actions/types'
import type { GenerationResult } from './generation-review/types'

// ============================================================
// Types
// ============================================================

type Mode = 'upload' | 'generate'
type StepStatus = 'selecting' | 'uploading' | 'generating' | 'reviewing' | 'failed'

interface UploadedFile {
  id: string
  file: File
  preview: string
  category?: string
}

interface GeneratedImage {
  id: string
  url: string
  category?: string
  label?: string
  dbId?: string // Library에 저장된 레코드 ID (좋아요 API용)
  isFavorite?: boolean
}

interface MediaChoiceResult {
  mode: Mode
  files?: UploadedFile[]
  generated?: GeneratedImage[]
}

interface MediaChoiceStepProps {
  stepId: string
  label: string
  description?: string
  config: MediaChoiceStepConfig
  value: MediaChoiceResult | null
  onChange: (value: MediaChoiceResult | null) => void
  onApprove?: () => void
  inputContext?: Record<string, unknown>
  projectId?: string | null
}

// ============================================================
// Adapter: StepAction <-> MediaChoiceResult 변환
// ============================================================

interface KidsAnchor {
  id: string
  originalUrl?: string
  category?: string
  name?: string
  dbId?: string
}

/** GeneratedImage[] → StepAction이 기대하는 GenerationResult로 래핑 */
function wrapAsGenerationResult(images: GeneratedImage[]): GenerationResult {
  return {
    data: {
      anchors: images.map((img) => ({
        id: img.id,
        originalUrl: img.url,
        category: img.category,
        name: img.label,
        dbId: img.dbId,
      })),
    },
    generatedAt: new Date(),
  }
}

/** StepAction의 GenerationResult → GeneratedImage[]로 변환 */
function unwrapToGeneratedImages(result: GenerationResult | null): GeneratedImage[] {
  if (!result) return []
  const data = result.data as { data?: { anchors?: KidsAnchor[] }; anchors?: KidsAnchor[] }
  const anchors = data?.data?.anchors || data?.anchors || []
  return anchors.map((anchor) => ({
    id: anchor.id,
    url: anchor.originalUrl || '',
    category: anchor.category,
    label: anchor.name,
    dbId: anchor.dbId,
    isFavorite: false,
  }))
}

// ============================================================
// Progress Display
// ============================================================

interface ProgressDisplayProps {
  progress: GenerationProgress
  showPerItem?: boolean
}

function _ProgressDisplay({ progress, showPerItem }: ProgressDisplayProps) {
  const percentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/80">{progress.message}</span>
          <span className="text-white/60">
            {progress.current}/{progress.total}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

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
    </div>
  )
}

// ============================================================
// Mode Selection
// ============================================================

interface ModeSelectionProps {
  modes: MediaChoiceStepConfig['modes']
  selectedMode: Mode | null
  onSelect: (mode: Mode) => void
}

function ModeSelection({ modes, selectedMode, onSelect }: ModeSelectionProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id
        const Icon = mode.id === 'upload' ? Upload : Sparkles

        return (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl p-6',
              'border-2 transition-all',
              isSelected
                ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            )}
          >
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full',
                isSelected
                  ? 'bg-[var(--color-neon-pink)]/20'
                  : 'bg-white/10'
              )}
            >
              <Icon
                className={cn(
                  'h-7 w-7',
                  isSelected ? 'text-[var(--color-neon-pink)]' : 'text-white/60'
                )}
              />
            </div>
            <div className="text-center">
              <p
                className={cn(
                  'font-medium',
                  isSelected ? 'text-[var(--color-neon-pink)]' : 'text-white'
                )}
              >
                {mode.label}
              </p>
              {mode.description && (
                <p className="mt-1 text-sm text-white/60">{mode.description}</p>
              )}
            </div>
            {mode.default && !selectedMode && (
              <span className="rounded-full bg-[var(--color-neon-lime)]/20 px-2 py-0.5 text-xs text-[var(--color-neon-lime)]">
                추천
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Upload Area
// ============================================================

interface UploadAreaProps {
  config: NonNullable<MediaChoiceStepConfig['uploadConfig']>
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
}

function UploadArea({ config, files, onFilesChange }: UploadAreaProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }))

    if (config.multiple) {
      onFilesChange([...files, ...newFiles])
    } else {
      // Clean up old previews
      files.forEach((f) => URL.revokeObjectURL(f.preview))
      onFilesChange(newFiles.slice(0, 1))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleRemove = (id: string) => {
    const file = files.find((f) => f.id === id)
    if (file) {
      URL.revokeObjectURL(file.preview)
    }
    onFilesChange(files.filter((f) => f.id !== id))
  }

  const handleCategoryChange = (id: string, category: string) => {
    onFilesChange(
      files.map((f) => (f.id === id ? { ...f, category } : f))
    )
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl p-8',
          'border-2 border-dashed transition-all',
          dragOver
            ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10'
            : 'border-white/30 bg-white/5 hover:border-white/50'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <ImagePlus className="h-6 w-6 text-white/60" />
        </div>
        <div className="text-center">
          <p className="font-medium text-white">이미지 업로드</p>
          <p className="mt-1 text-sm text-white/60">
            클릭하거나 파일을 드래그하세요
          </p>
          <p className="mt-1 text-xs text-white/40">
            최대 {config.maxSizeMb}MB · {config.accept.join(', ')}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={config.accept.join(',')}
          multiple={config.multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File Preview Grid */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">
              업로드된 이미지 ({files.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                files.forEach((f) => URL.revokeObjectURL(f.preview))
                onFilesChange([])
              }}
              className="h-8 text-white/60 hover:text-white"
            >
              전체 삭제
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="h-full w-full object-cover"
                />

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(file.id)}
                  className={cn(
                    'absolute right-2 top-2 rounded-full bg-black/60 p-1.5',
                    'opacity-0 transition-opacity group-hover:opacity-100'
                  )}
                >
                  <X className="h-3 w-3 text-white" />
                </button>

                {/* Category Selector */}
                {config.categories && config.categories.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                    <select
                      value={file.category || ''}
                      onChange={(e) =>
                        handleCategoryChange(file.id, e.target.value)
                      }
                      className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
                    >
                      <option value="" className="bg-black">
                        분류 선택
                      </option>
                      {config.categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-black">
                          {cat === 'character' ? '캐릭터' : '배경'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Generated Preview
// ============================================================

interface GeneratedPreviewProps {
  images: GeneratedImage[]
  onRegenerateItem?: (id: string) => void
  onLikeItem?: (id: string) => void
  onDownloadItem?: (id: string, url: string) => void
}

function GeneratedPreview({ images, onRegenerateItem, onLikeItem, onDownloadItem }: GeneratedPreviewProps) {
  const [likedItems, setLikedItems] = React.useState<Set<string>>(() => {
    // 초기값: 이미 좋아요된 이미지들
    const initialLiked = new Set<string>()
    images.forEach((img) => {
      if (img.isFavorite) {
        initialLiked.add(img.id)
      }
    })
    return initialLiked
  })
  const [loadingItems, setLoadingItems] = React.useState<Set<string>>(new Set())

  const handleLike = async (id: string) => {
    const image = images.find((img) => img.id === id)

    // dbId가 없으면 로컬 상태만 토글
    if (!image?.dbId) {
      setLikedItems((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })
      onLikeItem?.(id)
      return
    }

    // API 호출로 좋아요 토글
    setLoadingItems((prev) => new Set(prev).add(id))

    try {
      const response = await fetch(`/api/library/${image.dbId}`, {
        method: 'PATCH',
      })

      if (response.ok) {
        const result = await response.json()
        const newFavorite = result.data?.is_favorite

        setLikedItems((prev) => {
          const newSet = new Set(prev)
          if (newFavorite) {
            newSet.add(id)
          } else {
            newSet.delete(id)
          }
          return newSet
        })
        onLikeItem?.(id)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleDownload = async (id: string, url: string) => {
    if (onDownloadItem) {
      onDownloadItem(id, url)
      return
    }
    // Default download behavior
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-white/60">
        생성된 이미지 ({images.length})
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-white/10"
          >
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={image.label || image.id}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            )}

            {image.label && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center text-xs text-white">
                {image.label}
              </div>
            )}

            {image.category && (
              <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                {image.category === 'character' ? '캐릭터' : '배경'}
              </div>
            )}

            {/* Hover action buttons */}
            <div className={cn(
              'absolute right-2 top-2 flex gap-1',
              'opacity-0 transition-opacity group-hover:opacity-100'
            )}>
              {image.url && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(image.id)
                    }}
                    disabled={loadingItems.has(image.id)}
                    className={cn(
                      'rounded-full bg-black/60 p-1.5 hover:bg-black/80',
                      loadingItems.has(image.id) && 'opacity-50 cursor-not-allowed'
                    )}
                    title="좋아요"
                  >
                    {loadingItems.has(image.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    ) : (
                      <Heart className={cn('h-3 w-3', likedItems.has(image.id) ? 'fill-red-500 text-red-500' : 'text-white')} />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(image.id, image.url!)
                    }}
                    className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                    title="다운로드"
                  >
                    <Download className="h-3 w-3 text-white" />
                  </button>
                </>
              )}
              {onRegenerateItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRegenerateItem(image.id)
                  }}
                  className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                  title="재생성"
                >
                  <RotateCcw className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function MediaChoiceStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
  inputContext,
  projectId,
}: MediaChoiceStepProps) {
  // 모델 선택 상태
  const { modelSelections, setModelSelection } = useWorkflowStore()
  const selectedModel = config.modelSelection
    ? (modelSelections[stepId] || config.modelSelection.defaultModelId)
    : undefined

  const [selectedMode, setSelectedMode] = React.useState<Mode | null>(
    value?.mode || config.modes.find((m) => m.default)?.id || null
  )
  const [status, setStatus] = React.useState<StepStatus>(
    value ? 'reviewing' : 'selecting'
  )
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>(
    value?.files || []
  )
  const [generatedImages, setGeneratedImages] = React.useState<GeneratedImage[]>(
    value?.generated || []
  )

  // Cleanup blob URLs on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach((f) => URL.revokeObjectURL(f.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only on unmount
  }, [])
  const [progress, setProgress] = React.useState<GenerationProgress>({
    stepId,
    status: 'idle',
    current: 0,
    total: 0,
    message: '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const isGeneratingRef = React.useRef(false)

  const _defaultMode = config.modes.find((m) => m.default)?.id || 'generate'

  // Handle mode selection
  const handleModeSelect = (mode: Mode) => {
    setSelectedMode(mode)
    setStatus('selecting')
    setUploadedFiles([])
    setGeneratedImages([])
    onChange(null)
  }

  // Handle upload complete
  const handleUploadComplete = () => {
    if (uploadedFiles.length === 0) return

    onChange({
      mode: 'upload',
      files: uploadedFiles,
    })
    setStatus('reviewing')
  }

  // Adapted callbacks: StepAction 콜백 → MediaChoiceResult 변환
  const buildAdaptedCallbacks = (): StepCallbacks => ({
    setStatus: (s) => setStatus(s === 'idle' ? 'selecting' : s as StepStatus),
    setProgress,
    setError,
    onChange: (genResult: GenerationResult | null) => {
      const images = unwrapToGeneratedImages(genResult)
      setGeneratedImages(images)
      onChange({ mode: 'generate', generated: images })
    },
    setCompletedUrls: () => {},
  })

  // Handle AI generation via StepAction
  const handleGenerate = async () => {
    const action = getAction(config.generateAction || 'kids/anchors')
    if (!action) {
      setError('등록되지 않은 액션입니다')
      setStatus('failed')
      return
    }

    setStatus('generating')
    setError(null)
    isGeneratingRef.current = true

    const kidsCtx = asKidsContext(inputContext)
    const scriptResult = unwrapStepResult(kidsCtx.script)
    const anchorPrompts = scriptResult?.anchorPrompts || []

    setProgress({
      stepId,
      status: 'generating',
      current: 0,
      total: anchorPrompts.length,
      message: '이미지 생성 준비 중...',
      items: anchorPrompts.map((ap) => ({
        id: ap.id,
        label: ap.name,
        status: 'pending' as const,
      })),
    })

    try {
      const actionCtx: StepActionContext = {
        inputContext: inputContext || {},
        sessionId: scriptResult?.sessionId || `session-${Date.now()}`,
        projectId: projectId || null,
        selectedModel,
        stepId,
        value: null,
        config: { previewType: 'image-grid', generateAction: config.generateAction || 'kids/anchors' },
      }
      await action.execute(actionCtx, buildAdaptedCallbacks())
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다')
      setStatus('failed')
    } finally {
      isGeneratingRef.current = false
    }
  }

  // Handle regenerate
  const handleRegenerate = () => {
    setGeneratedImages([])
    onChange(null)
    handleGenerate()
  }

  // Handle individual item regeneration via StepAction
  const handleRegenerateItem = async (itemId: string) => {
    const action = getAction(config.generateAction || 'kids/anchors')
    if (!action?.regenerateItem) return

    // 로딩 표시
    setGeneratedImages((prev) =>
      prev.map((img) =>
        img.id === itemId ? { ...img, url: '' } : img
      )
    )

    try {
      const kidsCtx = asKidsContext(inputContext)
      const scriptResult = unwrapStepResult(kidsCtx.script)

      const actionCtx: StepActionContext = {
        inputContext: inputContext || {},
        sessionId: scriptResult?.sessionId || `session-${Date.now()}`,
        projectId: projectId || null,
        selectedModel,
        stepId,
        value: wrapAsGenerationResult(generatedImages),
        config: { previewType: 'image-grid', generateAction: config.generateAction || 'kids/anchors' },
      }

      const adaptedCallbacks = {
        ...buildAdaptedCallbacks(),
        setRegeneratingItemId: () => {},
      }

      await action.regenerateItem(itemId, undefined, actionCtx, adaptedCallbacks)
    } catch (err) {
      console.error('Regenerate failed:', err)
      // 에러 시 원본 복구
      const originalImage = value?.generated?.find((g) => g.id === itemId)
      if (originalImage) {
        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.id === itemId ? { ...img, url: originalImage.url } : img
          )
        )
      }
    }
  }

  // Check if can proceed with upload
  const canProceedUpload = uploadedFiles.length > 0

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
          'space-y-6 rounded-xl p-6',
          'border-2 border-white/30 bg-white/5',
          status === 'reviewing' && 'border-solid'
        )}
      >
        {/* Mode Selection - Always visible unless generating */}
        {status !== 'generating' && (
          <ModeSelection
            modes={config.modes}
            selectedMode={selectedMode}
            onSelect={handleModeSelect}
          />
        )}

        {/* Upload Mode Content */}
        {selectedMode === 'upload' && status !== 'generating' && (
          <div className="space-y-4">
            <UploadArea
              config={config.uploadConfig!}
              files={uploadedFiles}
              onFilesChange={(files) => {
                setUploadedFiles(files)
                if (status === 'reviewing') {
                  onChange({
                    mode: 'upload',
                    files,
                  })
                }
              }}
            />

            {status === 'selecting' && canProceedUpload && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleUploadComplete}
                  className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)]"
                >
                  <Check className="mr-2 h-4 w-4" />
                  업로드 완료
                </Button>
              </div>
            )}

            {status === 'reviewing' && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus('selecting')
                    onChange(null)
                  }}
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  다시 선택
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Generate Mode - Initial */}
        {selectedMode === 'generate' && status === 'selecting' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
              <p className="text-sm text-white/60">
                스크립트를 기반으로 캐릭터와 배경 이미지를 자동 생성합니다
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {config.modelSelection && (
                <WorkflowModelPopup
                  config={config.modelSelection}
                  value={selectedModel!}
                  onChange={(id) => setModelSelection(stepId, id)}
                />
              )}
              <Button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-neon-pink)]/30"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI 생성 시작
              </Button>
            </div>
          </div>
        )}

        {/* Generating State */}
        {status === 'generating' && (
          <div className="w-full">
            <ImageGridSkeleton
              count={progress.total || 6}
              items={progress.items}
              completedUrls={generatedImages.reduce(
                (acc, img) => {
                  if (img.url) {
                    acc[img.id] = img.url
                  }
                  return acc
                },
                {} as Record<string, string>
              )}
            />
          </div>
        )}

        {/* Reviewing Generated */}
        {selectedMode === 'generate' && status === 'reviewing' && (
          <div className="space-y-4">
            <GeneratedPreview
              images={generatedImages}
              onRegenerateItem={handleRegenerateItem}
            />

            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                전체 재생성
              </Button>
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-4">
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
          </div>
        )}
      </div>
    </div>
  )
}
