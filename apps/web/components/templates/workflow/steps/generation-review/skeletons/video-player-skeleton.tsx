'use client'

import { cn } from '@/lib/utils'
import { Loader2, Film, Music, ImageIcon } from 'lucide-react'

interface VideoPlayerSkeletonProps {
  /** 총 예상 길이 (초) */
  totalDuration?: number
  /** 현재 단계 */
  currentStage?: 'composing' | 'rendering' | 'encoding' | 'uploading'
  /** 진행률 (0-100) */
  progress?: number
}

export function VideoPlayerSkeleton({
  totalDuration = 50,
  currentStage = 'composing',
  progress = 0,
}: VideoPlayerSkeletonProps) {
  const stageLabels: Record<string, string> = {
    composing: '비디오 합성 중',
    rendering: '렌더링 중',
    encoding: '인코딩 중',
    uploading: '업로드 중',
  }

  const stageDescriptions: Record<string, string> = {
    composing: '비디오, 나레이션, BGM을 하나로 합치고 있어요',
    rendering: '최종 영상을 렌더링하고 있어요',
    encoding: '영상을 최적화하고 있어요',
    uploading: '완성된 영상을 저장하고 있어요',
  }

  return (
    <div className="w-full space-y-4">
      {/* 16:9 비디오 플레이어 스켈레톤 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/50">
        {/* 배경 그라데이션 애니메이션 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-pink)]/10 via-transparent to-[var(--color-neon-cyan)]/10 animate-pulse" />

        {/* 중앙 로딩 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {/* 로딩 아이콘 */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-neon-pink)]/30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neon-pink)]/20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-neon-pink)]" />
            </div>
          </div>

          {/* 단계 메시지 */}
          <div className="text-center">
            <p className="text-sm font-medium text-white">
              {stageLabels[currentStage]}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {stageDescriptions[currentStage]}
            </p>
          </div>

          {/* 진행률 바 */}
          {progress > 0 && (
            <div className="w-48">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-white/40">
                {progress}%
              </p>
            </div>
          )}
        </div>

        {/* 하단 타임라인 표시 */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>0:00</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Film className="h-3 w-3" />
                <span>비디오</span>
              </div>
              <div className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                <span>오디오</span>
              </div>
            </div>
            <span>
              {Math.floor(totalDuration / 60)}:
              {String(Math.floor(totalDuration % 60)).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* 합성 구성요소 미리보기 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
          <Film className="h-4 w-4 text-[var(--color-neon-lime)]" />
          <div className="flex-1">
            <p className="text-xs text-white/80">비디오 클립</p>
            <p className="text-[10px] text-white/40">5개 샷</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
          <Music className="h-4 w-4 text-[var(--color-neon-cyan)]" />
          <div className="flex-1">
            <p className="text-xs text-white/80">나레이션</p>
            <p className="text-[10px] text-white/40">TTS 합성</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
          <ImageIcon className="h-4 w-4 text-[var(--color-neon-pink)]" />
          <div className="flex-1">
            <p className="text-xs text-white/80">BGM</p>
            <p className="text-[10px] text-white/40">배경음악</p>
          </div>
        </div>
      </div>
    </div>
  )
}
