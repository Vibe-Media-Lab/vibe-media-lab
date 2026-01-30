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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type {
  GenerationReviewStepProps,
  GenerationProgress,
  GenerationProgressItem,
  StepStatus,
} from './types'
import { ProgressDisplay } from './progress-display'
import { Preview } from './preview'

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

    const story = storyResponse?.story
    const script = scriptResponse?.script
    const anchors = anchorsStepData?.generated?.map((a) => ({
      id: a.id,
      url: a.url,
      category: a.category,
      name: a.label,
    })) || []
    const shots = shotsResponse?.shots

    const baseRequest = {
      sessionId: sessionId || storyResponse?.sessionId || `session-${Date.now()}`,
      topic: setupData.topic,
      formFactor: setupData.formFactor || 'longform',
      style: setupData.style || 'pixar',
    }

    switch (config.generateAction) {
      case 'kids/story':
        return baseRequest

      case 'kids/script':
        return {
          ...baseRequest,
          story,
        }

      case 'kids/expand':
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

        onChange({
          data: result,
          generatedAt: new Date(),
        })
        setStatus('reviewing')
        return
      }

      await mockGenerate(total, items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다')
      setStatus('failed')
    }
  }

  const mockGenerate = async (total: number, items: GenerationProgressItem[]) => {
    const setupData = (inputContext?.setup as Record<string, unknown>) || {}
    const topic = (setupData.topic as string) || '손씻기'

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

    let mockData: unknown

    switch (config.previewType) {
      case 'text':
        mockData = `# ${topic}의 대모험\n\n## 교훈\n${topic}의 중요성을 배우는 이야기`
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
