'use client'

import { cn } from '@/lib/utils'
import { Loader2, Volume2 } from 'lucide-react'
import type { GenerationProgressItem } from '../types'

interface AudioPlayerSkeletonProps {
  /** 예상 아이템 개수 (TTS + BGM) */
  count: number
  /** 진행 중인 아이템들의 상태 */
  items?: GenerationProgressItem[]
  /** 현재 생성 중인 단계 메시지 */
  currentStage?: string
}

export function AudioPlayerSkeleton({
  count,
  items = [],
  currentStage,
}: AudioPlayerSkeletonProps) {
  const completedCount = items.filter((i) => i.status === 'completed').length

  // TTS와 BGM 분리 (보통 BGM은 마지막 1-2개)
  const ttsCount = Math.max(count - 2, 0)
  const bgmCount = Math.min(count, 2)

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/60">
          오디오 생성 중 ({completedCount}/{count})
        </span>
        {currentStage && (
          <span className="text-xs text-[var(--color-neon-pink)]">
            {currentStage}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* TTS 스켈레톤 */}
        {ttsCount > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs text-white/40">나레이션</span>
            {Array.from({ length: ttsCount }, (_, i) => {
              const item = items[i]
              const status = item?.status || 'pending'

              return (
                <div
                  key={`tts-${i}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    status === 'completed'
                      ? 'border-[var(--color-neon-lime)]/50 bg-[var(--color-neon-lime)]/10'
                      : status === 'processing'
                        ? 'border-[var(--color-neon-pink)]/50 bg-[var(--color-neon-pink)]/10'
                        : 'border-white/10 bg-white/5'
                  )}
                >
                  {/* 재생 버튼 영역 */}
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                      status === 'completed'
                        ? 'bg-[var(--color-neon-lime)]/20'
                        : status === 'processing'
                          ? 'bg-[var(--color-neon-pink)]/20'
                          : 'bg-white/10'
                    )}
                  >
                    {status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-neon-pink)]" />
                    ) : (
                      <div
                        className={cn(
                          'h-3 w-3 rounded-sm',
                          status === 'completed'
                            ? 'bg-[var(--color-neon-lime)]'
                            : 'bg-white/30'
                        )}
                      />
                    )}
                  </div>

                  {/* 웨이브폼 스켈레톤 */}
                  <div className="flex-1">
                    <div className="flex h-6 items-end gap-0.5">
                      {Array.from({ length: 20 }, (_, j) => (
                        <div
                          key={j}
                          className={cn(
                            'w-1 rounded-full',
                            status === 'completed'
                              ? 'bg-[var(--color-neon-lime)]/60'
                              : status === 'processing'
                                ? 'bg-[var(--color-neon-pink)]/60 animate-pulse'
                                : 'bg-white/20'
                          )}
                          style={{
                            height: `${Math.random() * 80 + 20}%`,
                            animationDelay:
                              status === 'processing' ? `${j * 50}ms` : '0ms',
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-white/40">
                      {status === 'completed'
                        ? '완료'
                        : status === 'processing'
                          ? '음성 합성 중...'
                          : `나레이션 #${i + 1}`}
                    </p>
                  </div>

                  <Volume2 className="h-4 w-4 text-white/40" />
                </div>
              )
            })}
          </div>
        )}

        {/* BGM 스켈레톤 */}
        {bgmCount > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs text-white/40">배경음악</span>
            {Array.from({ length: bgmCount }, (_, i) => {
              const bgmIndex = ttsCount + i
              const item = items[bgmIndex]
              const status = item?.status || 'pending'

              return (
                <div
                  key={`bgm-${i}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    status === 'completed'
                      ? 'border-[var(--color-neon-cyan)]/50 bg-[var(--color-neon-cyan)]/10'
                      : status === 'processing'
                        ? 'border-[var(--color-neon-pink)]/50 bg-[var(--color-neon-pink)]/10'
                        : 'border-white/10 bg-white/5'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                      status === 'processing'
                        ? 'bg-[var(--color-neon-pink)]/20'
                        : 'bg-white/10'
                    )}
                  >
                    {status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-neon-pink)]" />
                    ) : (
                      <div className="h-3 w-3 rounded-sm bg-white/30" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-white/60">
                      {status === 'completed'
                        ? `BGM 옵션 ${i + 1}`
                        : status === 'processing'
                          ? 'AI 작곡 중...'
                          : `BGM ${i + 1}`}
                    </p>
                    <p className="text-xs text-white/40">
                      {status === 'processing'
                        ? 'Suno AI가 음악을 만들고 있어요'
                        : '대기 중'}
                    </p>
                  </div>

                  <Volume2 className="h-4 w-4 text-white/40" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
