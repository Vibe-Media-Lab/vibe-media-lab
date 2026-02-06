'use client'

import { Loader2, Sparkles } from 'lucide-react'

interface TextSkeletonProps {
  /** 생성 중인 텍스트 타입 */
  type?: 'story' | 'script' | 'general'
  /** 현재 생성 중인 단계 */
  currentStage?: string
}

export function TextSkeleton({ type = 'general', currentStage }: TextSkeletonProps) {
  const getTitle = () => {
    switch (type) {
      case 'story':
        return '스토리 생성 중'
      case 'script':
        return '대본 생성 중'
      default:
        return '텍스트 생성 중'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'story':
        return 'AI가 창의적인 스토리를 만들고 있어요'
      case 'script':
        return 'AI가 샷별 대본을 작성하고 있어요'
      default:
        return 'AI가 텍스트를 생성하고 있어요'
    }
  }

  // 스켈레톤 라인들의 너비
  const lineWidths =
    type === 'story'
      ? ['100%', '95%', '88%', '100%', '72%', '100%', '90%', '65%']
      : type === 'script'
        ? ['60%', '100%', '85%', '45%', '100%', '78%', '55%']
        : ['100%', '90%', '75%', '100%', '60%']

  return (
    <div className="w-full space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-neon-pink)]" />
          <span className="text-sm font-medium text-white/80">{getTitle()}</span>
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-neon-pink)]" />
      </div>

      {/* 스켈레톤 카드 */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        {/* 타이틀 스켈레톤 */}
        <div className="h-6 w-48 animate-pulse rounded bg-white/20" />

        {/* 텍스트 라인 스켈레톤 */}
        <div className="space-y-2 pt-2">
          {lineWidths.map((width, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-white/10"
              style={{
                width,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* 현재 단계 메시지 */}
        {currentStage && (
          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-neon-pink)]" />
            <span className="text-xs text-[var(--color-neon-pink)]">
              {currentStage}
            </span>
          </div>
        )}
      </div>

      {/* 설명 */}
      <p className="text-center text-xs text-white/40">{getDescription()}</p>
    </div>
  )
}
