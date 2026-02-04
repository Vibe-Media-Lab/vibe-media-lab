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

  // 스켈레톤 렌더링
  const renderSkeleton = () => {
    switch (previewType) {
      case 'image-grid':
      case 'shot-gallery':
        return (
          <ImageGridSkeleton
            count={total || 5}
            items={items}
            completedUrls={completedUrls}
          />
        )

      case 'video-timeline':
        return (
          <VideoTimelineSkeleton
            count={total || 5}
            duration={10}
            items={items}
            completedUrls={completedUrls}
          />
        )

      case 'audio-player':
        return (
          <AudioPlayerSkeleton
            count={total || 7}
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
