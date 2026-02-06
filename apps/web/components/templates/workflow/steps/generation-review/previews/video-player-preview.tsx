'use client'

import { Film, Clock } from 'lucide-react'

interface VideoPlayerPreviewProps {
  data: {
    url?: string
    thumbnailUrl?: string
    totalDuration?: number
  }
}

export function VideoPlayerPreview({ data }: VideoPlayerPreviewProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full space-y-2">
      <span className="text-sm font-medium text-white/60">최종 영상</span>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        {data.url ? (
          <video
            src={data.url}
            controls
            className="h-full w-full"
            poster={data.thumbnailUrl}
          />
        ) : data.thumbnailUrl ? (
          // 영상 합성 진행 중 상태 (썸네일 + 프로그레스)
          <div className="relative h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.thumbnailUrl}
              alt="영상 썸네일"
              className="h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* 프로그레스 링 */}
              <div className="relative mb-4">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-white/20 border-t-[var(--color-neon-cyan)]" />
                <Film className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/80" />
              </div>

              <p className="text-base font-medium text-white">영상 합성 중...</p>
              <p className="mt-1 text-sm text-white/60">
                비디오와 오디오를 결합하고 있습니다
              </p>

              {data.totalDuration && (
                <div className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Clock className="h-4 w-4 text-[var(--color-neon-cyan)]" />
                  <span className="text-sm text-white/80">
                    예상 길이: {formatDuration(data.totalDuration)}
                  </span>
                </div>
              )}

              {/* 프로그레스 바 */}
              <div className="mt-4 w-2/3">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full animate-pulse rounded-full bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-pink)]"
                    style={{ width: '60%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-white/40">
            <Film className="mb-2 h-8 w-8" />
            <span className="text-sm">영상 없음</span>
          </div>
        )}
      </div>
    </div>
  )
}
