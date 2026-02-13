'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Sparkles,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  asKidsContext,
  unwrapStepResult,
  unwrapApiData,
} from '@/lib/api/kids-animation/types'
import { getUserFriendlyError } from '@/lib/utils/error-messages'
import { getAction } from '@/lib/step-actions/registry'
import type { StepActionContext, StepCallbacks } from '@/lib/step-actions/types'
import type {
  GenerationReviewStepProps,
  GenerationProgress,
  GenerationProgressItem,
  StepStatus,
} from './types'
import { GeneratingPreview } from './generating-preview'
import { Preview } from './preview'
import { ManualVideoUpload } from './manual-video-upload'
import { ManualAudioUpload } from './manual-audio-upload'
import { useGenerationMode } from './use-generation-mode'
import { WorkflowModelPopup } from './workflow-model-popup'
import { useWorkflowStore } from '@/lib/stores/workflow-store'

// 실제로 유효한 데이터가 있는지 확인 (previewType 기반 중앙 판정)
function hasValidGeneratedData(val: unknown, previewType: string): boolean {
  if (!val) return false

  const data = (val as { data?: unknown })?.data
  if (!data) return false

  const unwrapped: unknown = unwrapApiData(data)

  switch (previewType) {
    case 'video-timeline': {
      const videoData = unwrapped as { shots?: Array<{ videoUrl?: string }> }
      if (!videoData?.shots?.length) return false
      return videoData.shots.some(shot => shot.videoUrl && shot.videoUrl.length > 0)
    }

    case 'image-grid':
    case 'shot-gallery': {
      if (Array.isArray(unwrapped)) {
        return unwrapped.some(item => item?.url || item?.imageUrl)
      }
      const expandedData = unwrapped as { expanded?: Array<{ url?: string }> }
      if (expandedData?.expanded?.length) {
        return expandedData.expanded.some(item => item.url && item.url.length > 0)
      }
      const anchorsData = unwrapped as { anchors?: Array<{ url?: string }> }
      if (anchorsData?.anchors?.length) {
        return anchorsData.anchors.some(item => item.url && item.url.length > 0)
      }
      const shotsData = unwrapped as { shots?: Array<{ imageUrl?: string }> }
      if (shotsData?.shots?.length) {
        return shotsData.shots.some(shot => shot.imageUrl && shot.imageUrl.length > 0)
      }
      return false
    }

    case 'audio-player': {
      const audioData = unwrapped as { tts?: Array<{ audioUrl?: string }>; bgmTracks?: Array<{ url?: string }> }
      const hasTts = audioData?.tts?.some(t => t.audioUrl && t.audioUrl.length > 0)
      const hasBgm = audioData?.bgmTracks?.some(t => t.url && t.url.length > 0)
      return !!(hasTts || hasBgm)
    }

    case 'video-player': {
      const finalData = unwrapped as { videoUrl?: string; thumbnailUrl?: string }
      return !!(finalData?.videoUrl || finalData?.thumbnailUrl)
    }

    case 'text':
    case 'shot-list':
      return !!unwrapped

    default:
      return !!unwrapped
  }
}

export function GenerationReviewStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
  inputContext,
  sessionId,
  projectId,
}: GenerationReviewStepProps) {
  const hasValidData = hasValidGeneratedData(value, config.previewType)
  const [generationMode, setGenerationMode] = useGenerationMode(config.generateAction || '')
  const isManualMode = (config.generateAction === 'kids/videos' || config.generateAction === 'kids/audio') && generationMode === 'manual'

  // 모델 선택 상태
  const { modelSelections, setModelSelection } = useWorkflowStore()
  const selectedModel = config.modelSelection
    ? (modelSelections[stepId] || config.modelSelection.defaultModelId)
    : undefined
  const selectedSecondaryModel = config.secondaryModelSelection
    ? (modelSelections[`${stepId}:secondary`] || config.secondaryModelSelection.defaultModelId)
    : undefined

  const [status, setStatus] = React.useState<StepStatus>(
    hasValidData ? 'reviewing' : 'idle'
  )
  const [progress, setProgress] = React.useState<GenerationProgress>({
    stepId,
    status: 'idle',
    current: 0,
    total: 0,
    message: '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const [selectedBgmIndex, setSelectedBgmIndex] = React.useState<number>(0)
  const [completedUrls, setCompletedUrls] = React.useState<Record<string, string>>({})
  const [regenerateMode, setRegenerateMode] = React.useState(false)
  const [selectedForRegenerate, setSelectedForRegenerate] = React.useState<Set<string>>(new Set())
  const [regeneratingItemId, setRegeneratingItemId] = React.useState<string | null>(null)
  const isGeneratingRef = React.useRef(false)

  // Reset status when stepId changes
  React.useEffect(() => {
    if (isGeneratingRef.current) return
    const isValid = hasValidGeneratedData(value, config.previewType)
    setStatus(isValid ? 'reviewing' : 'idle')
    setError(null)
    setProgress({ stepId, status: 'idle', current: 0, total: 0, message: '' })
    setCompletedUrls({})
    setRegenerateMode(false)
    setSelectedForRegenerate(new Set())
    setRegeneratingItemId(null)
  }, [stepId, value, config.previewType])

  const handleToggleRegenerate = (id: string, isBgm: boolean) => {
    setSelectedForRegenerate(prev => {
      const next = new Set(prev)
      const key = isBgm ? 'bgm' : id
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  /** StepAction에 전달할 컨텍스트 빌드 */
  const buildActionContext = (): StepActionContext => ({
    inputContext: inputContext || {},
    sessionId: sessionId || `session-${Date.now()}`,
    projectId: projectId || null,
    selectedModel,
    selectedSecondaryModel,
    stepId,
    value,
    config: {
      batchSize: config.batchSize,
      previewType: config.previewType,
      generateAction: config.generateAction || '',
    },
    regenerateMode,
    selectedForRegenerate,
    selectedBgmIndex,
  })

  /** StepAction에 전달할 콜백 빌드 */
  const buildCallbacks = (): StepCallbacks => ({
    setStatus,
    setProgress,
    setError,
    onChange,
    setCompletedUrls,
  })

  const handleGenerate = async () => {
    const action = getAction(config.generateAction || '')

    isGeneratingRef.current = true
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
      if (!action) {
        throw new Error(`등록되지 않은 액션: ${config.generateAction}`)
      }
      const ctx = buildActionContext()
      const callbacks = buildCallbacks()
      await action.execute(ctx, callbacks)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '생성에 실패했습니다'
      const friendly = getUserFriendlyError(errorMsg)
      setError(errorMsg)
      setStatus('failed')
      toast.error(friendly.message, { description: friendly.suggestion })
    } finally {
      isGeneratingRef.current = false
    }
  }

  const handleRegenerate = () => {
    onChange(null)
    handleGenerate()
  }

  const handleRegenerateItem = async (itemId: string, editedPrompt?: string) => {
    const action = getAction(config.generateAction || '')
    if (!action?.regenerateItem) return
    if (regeneratingItemId) return

    setRegeneratingItemId(itemId)
    setError(null)
    isGeneratingRef.current = true

    try {
      const ctx = buildActionContext()
      const callbacks = { ...buildCallbacks(), setRegeneratingItemId }
      await action.regenerateItem(itemId, editedPrompt, ctx, callbacks)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '재생성에 실패했습니다'
      const friendly = getUserFriendlyError(errorMsg)
      setError(errorMsg)
      toast.error(friendly.message, { description: friendly.suggestion })
    } finally {
      setRegeneratingItemId(null)
      isGeneratingRef.current = false
    }
  }

  const handleLikeItem = async (_itemId: string, url: string) => {
    try {
      const response = await fetch('/api/library/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputUrl: url }),
      })
      const result = await response.json()
      if (!result.success) {
        console.error('Failed to toggle favorite:', result.error)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const handleDownloadItem = async (_itemId: string, url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      const ext = blob.type.includes('video') ? 'mp4' : blob.type.includes('audio') ? 'mp3' : 'png'
      link.download = `vibe-${_itemId}-${Date.now()}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleEdit = (editedData: unknown) => {
    if (value) {
      onChange({ ...value, data: editedData })
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
            {/* 모드 토글 - 비디오/오디오 단계에서만 */}
            {(config.generateAction === 'kids/videos' || config.generateAction === 'kids/audio') && (
              <div className="flex w-full items-center justify-end gap-2 pb-2">
                <span className="text-xs text-white/50">모드:</span>
                <div className="flex rounded-md border border-white/20 p-0.5">
                  <button
                    onClick={() => setGenerationMode('auto')}
                    className={cn(
                      'rounded px-3 py-1 text-xs transition-colors',
                      generationMode === 'auto'
                        ? 'bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)]'
                        : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    자동 생성
                  </button>
                  <button
                    onClick={() => setGenerationMode('manual')}
                    className={cn(
                      'rounded px-3 py-1 text-xs transition-colors',
                      generationMode === 'manual'
                        ? 'bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]'
                        : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    수동 업로드
                  </button>
                </div>
              </div>
            )}

            {isManualMode ? (
              config.generateAction === 'kids/videos' ? (
                <ManualVideoUpload
                  shots={(() => {
                    const ctx = asKidsContext(inputContext)
                    const shotsData = unwrapStepResult(ctx.shots)
                    return (shotsData?.shots || []).map(s => ({
                      id: s.id,
                      shotNumber: s.shotNumber,
                      duration: s.duration || 10,
                      imageUrl: s.imageUrl || '',
                      visualPrompt: s.visualPrompt || '',
                    }))
                  })()}
                  sessionId={sessionId || `session-${Date.now()}`}
                  onComplete={(result) => {
                    onChange(result)
                    setStatus('reviewing')
                  }}
                />
              ) : (
                <ManualAudioUpload
                  shots={(() => {
                    const ctx = asKidsContext(inputContext)
                    const scriptData = unwrapStepResult(ctx.script)
                    const shotsData = unwrapStepResult(ctx.shots)
                    const scriptShots = (scriptData?.script as { shots?: Array<{ id: string; shotNumber: number; narration: string }> })?.shots
                    return (scriptShots || shotsData?.shots || []).map(s => ({
                      id: s.id,
                      shotNumber: s.shotNumber,
                      narration: s.narration || '',
                    }))
                  })()}
                  bgmPrompt={(() => {
                    const ctx = asKidsContext(inputContext)
                    const storyData = unwrapStepResult(ctx.story)
                    const scriptData = unwrapStepResult(ctx.script)
                    const bgmDirection = (storyData?.story as { bgmDirection?: string })?.bgmDirection
                    const bgmPrompt = (scriptData?.script as { bgmPrompt?: string })?.bgmPrompt
                    return bgmDirection || bgmPrompt || ''
                  })()}
                  sessionId={sessionId || `session-${Date.now()}`}
                  onComplete={(result) => {
                    onChange(result)
                    setStatus('reviewing')
                  }}
                />
              )
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-pink)]/20 to-[var(--color-neon-cyan)]/20">
                  <Sparkles className="h-5 w-5 text-[var(--color-neon-pink)]" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-white">AI 생성 준비</p>
                  <p className="mt-1 text-sm text-white/60">
                    버튼을 클릭하면 AI가 콘텐츠를 생성합니다
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {config.modelSelection && (
                    <WorkflowModelPopup
                      config={config.modelSelection}
                      value={selectedModel!}
                      onChange={(id) => setModelSelection(stepId, id)}
                      label={config.secondaryModelSelection ? 'TTS' : undefined}
                    />
                  )}
                  {config.secondaryModelSelection && (
                    <WorkflowModelPopup
                      config={config.secondaryModelSelection}
                      value={selectedSecondaryModel!}
                      onChange={(id) => setModelSelection(`${stepId}:secondary`, id)}
                      label="BGM"
                    />
                  )}
                  <Button
                    onClick={handleGenerate}
                    className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-neon-pink)]/30"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    생성 시작
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Generating State */}
        {status === 'generating' && (
          <GeneratingPreview
            config={config}
            progress={progress}
            completedUrls={completedUrls}
          />
        )}

        {/* Reviewing State */}
        {status === 'reviewing' && value && (
          <div className="w-full space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Preview
              type={config.previewType}
              data={value.data}
              editable={config.editable}
              onEdit={handleEdit}
              onRegenerateItem={handleRegenerateItem}
              onLikeItem={handleLikeItem}
              onDownloadItem={handleDownloadItem}
              selectedBgmIndex={selectedBgmIndex}
              onSelectBgm={setSelectedBgmIndex}
              regenerateMode={regenerateMode}
              selectedForRegenerate={selectedForRegenerate}
              onToggleRegenerate={handleToggleRegenerate}
              regeneratingItemId={regeneratingItemId}
            />

            <div className="flex justify-center gap-3 pt-4">
              {isManualMode ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    onChange(null)
                    setStatus('idle')
                  }}
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  교체하기
                </Button>
              ) : (
                <>
                  {config.previewType === 'audio-player' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (regenerateMode) {
                          setSelectedForRegenerate(new Set())
                        }
                        setRegenerateMode(!regenerateMode)
                      }}
                      className={cn(
                        'border-white/30 bg-transparent hover:bg-white/10',
                        regenerateMode
                          ? 'text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]'
                          : 'text-white'
                      )}
                    >
                      {regenerateMode ? '선택 취소' : '선택 재생성'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (regenerateMode && selectedForRegenerate.size > 0) {
                        handleRegenerate()
                        setRegenerateMode(false)
                      } else {
                        handleRegenerate()
                      }
                    }}
                    className="border-white/30 bg-transparent text-white hover:bg-white/10"
                    disabled={regenerateMode && selectedForRegenerate.size === 0}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {regenerateMode && selectedForRegenerate.size > 0
                      ? `선택 항목 재생성 (${selectedForRegenerate.size}개)`
                      : '전체 재생성'}
                  </Button>
                </>
              )}
            </div>
          </div>
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
