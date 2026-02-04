'use client'

import type { GenerationProgress, GenerationReviewStepConfig } from './types'
import {
  ImageGridSkeleton,
  VideoTimelineSkeleton,
  AudioPlayerSkeleton,
  TextSkeleton,
  VideoPlayerSkeleton,
} from './skeletons'

interface GeneratingPreviewProps {
  config: GenerationReviewStepConfig
  progress: GenerationProgress
  /** 완료된 아이템의 URL 매핑 (점진적 로딩용) */
  completedUrls?: Record<string, string>
}

/**
 * 생성 중일 때 표시되는 프리뷰 컴포넌트
 * previewType에 따라 적절한 스켈레톤 UI를 렌더링하고
 * 점진적으로 완료된 아이템은 실제 데이터로 표시
 */
export function GeneratingPreview({
  config,
  progress,
  completedUrls = {},
}: GeneratingPreviewProps) {
  const { previewType } = config
  const { items = [], total, message } = progress

  // previewType별 기본 스켈레톤 개수 (batchSize가 없거나 1일 때 사용)
  // generateAction으로 더 정확한 기본값 결정
  const getDefaultCount = (type: string, action?: string): number => {
    // generateAction 기반 특수 케이스
    if (action?.includes('expand')) {
      // 앵커 확장: 캐릭터 3개×3변형 + 배경 3개×1변형 = 12
      return 12
    }

    switch (type) {
      case 'image-grid':
        return 6 // 캐릭터 + 배경 앵커
      case 'shot-gallery':
        return 6 // 6-Act 기준 샷
      case 'video-timeline':
        return 6 // 6-Act 기준 비디오
      case 'audio-player':
        return 8 // TTS 6개 + BGM 2개
      default:
        return 5
    }
  }

  // total이 1 이하면 기본값 사용 (batchSize가 없는 경우)
  const effectiveCount = total > 1 ? total : getDefaultCount(previewType, config.generateAction)

  // 스켈레톤 렌더링
  const renderSkeleton = () => {
    switch (previewType) {
      case 'image-grid':
      case 'shot-gallery':
        return (
          <ImageGridSkeleton
            count={effectiveCount}
            items={items}
            completedUrls={completedUrls}
          />
        )

      case 'video-timeline':
        return (
          <VideoTimelineSkeleton
            count={effectiveCount}
            duration={10}
            items={items}
            completedUrls={completedUrls}
          />
        )

      case 'audio-player':
        return (
          <AudioPlayerSkeleton
            count={effectiveCount}
            items={items}
            currentStage={message}
          />
        )

      case 'video-player':
        return (
          <VideoPlayerSkeleton
            totalDuration={50}
            currentStage={getVideoStage(message)}
            progress={total > 0 ? Math.round((progress.current / total) * 100) : 0}
          />
        )

      case 'text':
        return (
          <TextSkeleton
            type={getTextType(config)}
            currentStage={message}
          />
        )

      case 'shot-list':
        return (
          <TextSkeleton
            type="script"
            currentStage={message}
          />
        )

      default:
        return (
          <TextSkeleton
            type="general"
            currentStage={message}
          />
        )
    }
  }

  return (
    <div className="w-full">
      {renderSkeleton()}
    </div>
  )
}

/**
 * 메시지에서 비디오 생성 단계 추출
 */
function getVideoStage(
  message: string
): 'composing' | 'rendering' | 'encoding' | 'uploading' {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('upload')) return 'uploading'
  if (lowerMessage.includes('encod')) return 'encoding'
  if (lowerMessage.includes('render')) return 'rendering'
  return 'composing'
}

/**
 * config에서 텍스트 타입 추출
 */
function getTextType(
  config: GenerationReviewStepConfig
): 'story' | 'script' | 'general' {
  const action = config.generateAction?.toLowerCase() || ''
  if (action.includes('story')) return 'story'
  if (action.includes('script') || action.includes('shot')) return 'script'
  return 'general'
}
