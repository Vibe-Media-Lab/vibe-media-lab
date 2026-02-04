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
import { GeneratingPreview } from './generating-preview'
import { Preview } from './preview'

// 실제로 유효한 데이터가 있는지 확인
function hasValidGeneratedData(val: unknown, previewType: string): boolean {
  if (!val) return false

  const data = (val as { data?: unknown })?.data
  if (!data) return false

  // API response unwrap: { success, data: { ... } } -> { ... }
  let unwrapped: unknown = data
  if (typeof data === 'object' && data !== null && 'success' in data && 'data' in data) {
    unwrapped = (data as { data: unknown }).data
  }

  switch (previewType) {
    case 'video-timeline': {
      // shots 배열이 있고, 최소 하나의 shot에 videoUrl이 있어야 함
      const videoData = unwrapped as { shots?: Array<{ videoUrl?: string }> }
      if (!videoData?.shots?.length) return false
      return videoData.shots.some(shot => shot.videoUrl && shot.videoUrl.length > 0)
    }

    case 'image-grid':
    case 'shot-gallery': {
      // 배열이 있고, 최소 하나의 항목에 url/imageUrl이 있어야 함
      if (Array.isArray(unwrapped)) {
        return unwrapped.some(item => item?.url || item?.imageUrl)
      }
      // expanded 응답 (expand API): { expanded: [...] }
      const expandedData = unwrapped as { expanded?: Array<{ url?: string }> }
      if (expandedData?.expanded?.length) {
        return expandedData.expanded.some(item => item.url && item.url.length > 0)
      }
      // anchors 응답 (anchors API): { anchors: [...] }
      const anchorsData = unwrapped as { anchors?: Array<{ url?: string }> }
      if (anchorsData?.anchors?.length) {
        return anchorsData.anchors.some(item => item.url && item.url.length > 0)
      }
      // shots 응답 (shots API): { shots: [...] }
      const shotsData = unwrapped as { shots?: Array<{ imageUrl?: string }> }
      if (shotsData?.shots?.length) {
        return shotsData.shots.some(shot => shot.imageUrl && shot.imageUrl.length > 0)
      }
      return false
    }

    case 'audio-player': {
      // tts나 bgmTracks에 url이 있어야 함
      const audioData = unwrapped as { tts?: Array<{ audioUrl?: string }>; bgmTracks?: Array<{ url?: string }> }
      const hasTts = audioData?.tts?.some(t => t.audioUrl && t.audioUrl.length > 0)
      const hasBgm = audioData?.bgmTracks?.some(t => t.url && t.url.length > 0)
      return !!(hasTts || hasBgm)
    }

    case 'video-player': {
      // final 응답: videoUrl 또는 thumbnailUrl이 있으면 유효
      const finalData = unwrapped as { videoUrl?: string; thumbnailUrl?: string }
      return !!(finalData?.videoUrl || finalData?.thumbnailUrl)
    }

    case 'text':
    case 'shot-list':
      // 텍스트나 shot-list는 데이터가 있으면 유효
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
  onApprove,
  inputContext,
  sessionId,
}: GenerationReviewStepProps) {
  const hasValidData = hasValidGeneratedData(value, config.previewType)

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

  // Reset status when stepId changes (switching between steps)
  React.useEffect(() => {
    const isValid = hasValidGeneratedData(value, config.previewType)
    setStatus(isValid ? 'reviewing' : 'idle')
    setError(null)
    setProgress({
      stepId,
      status: 'idle',
      current: 0,
      total: 0,
      message: '',
    })
    setCompletedUrls({})
  }, [stepId, value, config.previewType])

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

      case 'kids/final': {
        // videos와 audio 응답에서 데이터 추출
        const videosData = inputContext?.videos as { data?: { success?: boolean; data?: { shots?: Array<{ id: string; shotNumber: number; videoUrl: string }> } } } | undefined
        const audioData = inputContext?.audio as { data?: { success?: boolean; data?: { tts?: Array<{ id: string; audioUrl: string; duration: number }>; bgmTracks?: Array<{ id: string; url: string; duration: number }> } } } | undefined

        const videosResponse = videosData?.data?.data || videosData?.data as { shots?: Array<{ id: string; shotNumber: number; videoUrl: string }> } | undefined
        const audioResponse = audioData?.data?.data || audioData?.data as { tts?: Array<{ id: string; audioUrl: string; duration: number }>; bgmTracks?: Array<{ id: string; url: string; duration: number }> } | undefined

        // shots 데이터 병합 (video + audio)
        const videoShots = videosResponse?.shots || []
        const ttsData = audioResponse?.tts || []
        // BGM: 사용자가 선택한 트랙 사용
        const bgmUrl = audioResponse?.bgmTracks?.[selectedBgmIndex]?.url || audioResponse?.bgmTracks?.[0]?.url || ''

        const mergedShots = videoShots.map((vShot) => {
          const tts = ttsData.find((t) => t.id === vShot.id)
          return {
            id: vShot.id,
            shotNumber: vShot.shotNumber,
            duration: tts?.duration || 10,
            videoUrl: vShot.videoUrl || '',
            audioUrl: tts?.audioUrl || '',
          }
        })

        return {
          sessionId: baseRequest.sessionId,
          shots: mergedShots,
          bgmUrl,
          style: baseRequest.style,
          songVersion: false,
        }
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

  // 순차적 비디오 생성 (클라이언트에서 하나씩 요청)
  const handleSequentialVideoGenerate = async (
    endpoint: string,
    shots: Array<{ id: string; shotNumber: number; duration: number; imageUrl: string; visualPrompt: string }>,
    baseRequest: Record<string, unknown>
  ) => {
    const results: Array<{ id: string; shotNumber: number; videoUrl: string }> = []

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]
      if (!shot) continue

      // 진행 상황 업데이트
      setProgress((prev) => {
        const updatedItems = (prev.items ?? []).map((item, idx) => ({
          ...item,
          status:
            idx < i
              ? ('completed' as const)
              : idx === i
                ? ('processing' as const)
                : ('pending' as const),
        }))

        return {
          ...prev,
          current: i,
          message: `비디오 ${i + 1}/${shots.length} 생성 중...`,
          items: updatedItems,
        }
      })

      // 단일 비디오 생성 요청
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: baseRequest.sessionId,
          shot,
          formFactor: baseRequest.formFactor,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Shot ${i + 1} 생성 실패: ${response.status}`)
      }

      const result = await response.json()
      const videoUrl = result.data?.videoUrl || ''

      // 결과 저장
      results.push({
        id: shot.id,
        shotNumber: shot.shotNumber,
        videoUrl,
      })

      // completedUrls 업데이트 (UI 즉시 반영)
      if (videoUrl) {
        setCompletedUrls((prev) => ({
          ...prev,
          [shot.id]: videoUrl,
        }))
      }

      // 진행 상황 업데이트 (완료)
      setProgress((prev) => {
        const updatedItems = (prev.items ?? []).map((item, idx) => ({
          ...item,
          status:
            idx <= i
              ? (idx === i && !videoUrl ? 'failed' as const : 'completed' as const)
              : idx === i + 1
                ? ('processing' as const)
                : ('pending' as const),
        }))

        return {
          ...prev,
          current: i + 1,
          message: videoUrl
            ? `비디오 ${i + 1}/${shots.length} 완료`
            : `비디오 ${i + 1}/${shots.length} 실패`,
          items: updatedItems,
        }
      })
    }

    // 전체 완료
    onChange({
      data: {
        success: true,
        data: {
          sessionId: baseRequest.sessionId,
          shots: results,
        },
      },
      generatedAt: new Date(),
    })
    setStatus('reviewing')
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
        // 비디오 생성은 순차 요청으로 처리
        if (config.generateAction === 'kids/videos') {
          // shots 데이터에서 아이템 정보 추출
          const shotsData = requestBody.shots as Array<{
            id: string
            shotNumber: number
            duration: number
            imageUrl: string
            visualPrompt: string
          }> | undefined

          if (!shotsData || shotsData.length === 0) {
            throw new Error('비디오 생성할 샷 데이터가 없습니다')
          }

          const videoItems: GenerationProgressItem[] = shotsData.map((shot, i) => ({
            id: shot.id,
            label: `Shot ${i + 1}`,
            status: 'pending' as const,
          }))

          // 첫 번째 항목을 processing으로
          const initialItems = videoItems.map((item, idx) => ({
            ...item,
            status: idx === 0 ? 'processing' as const : 'pending' as const,
          }))

          setProgress((prev) => ({
            ...prev,
            total: videoItems.length,
            message: '비디오 생성 시작...',
            items: initialItems,
          }))

          await handleSequentialVideoGenerate(endpoint, shotsData, requestBody)
          return
        }

        // 다른 엔드포인트는 기존 방식
        setProgress((prev) => {
          const prevItems = prev.items ?? []
          const processingItems = prevItems.length > 0
            ? prevItems.map((item) => ({ ...item, status: 'processing' as const }))
            : Array.from({ length: prev.total || 6 }, (_, i) => ({
                id: `item-${i + 1}`,
                label: `#${i + 1}`,
                status: 'processing' as const,
              }))

          return {
            ...prev,
            message: 'API 호출 중...',
            items: processingItems,
          }
        })

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
      console.error('[GenerationReview] Error caught:', err)
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

  const handleRegenerateItem = async (itemId: string) => {
    // TODO: Implement individual item regeneration
    console.log('Regenerate item:', itemId)
  }

  const handleLikeItem = async (itemId: string) => {
    // TODO: Implement like functionality (save to library favorites)
    console.log('Like item:', itemId)
  }

  const handleDownloadItem = async (itemId: string, url: string) => {
    // Default download is handled in preview components
    console.log('Download item:', itemId, url)
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
          <GeneratingPreview
            config={config}
            progress={progress}
            completedUrls={completedUrls}
          />
        )}

        {/* Reviewing State */}
        {status === 'reviewing' && value && (
          <div className="w-full space-y-4">
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
