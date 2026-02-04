'use client'

import { cn } from '@/lib/utils'
import { Loader2, Play } from 'lucide-react'
import type { GenerationProgressItem } from '../types'

interface VideoTimelineSkeletonProps {
  /** 예상 아이템 개수 */
  count: number
  /** 각 비디오 예상 길이 (초) */
  duration?: number
  /** 진행 중인 아이템들의 상태 */
  items?: GenerationProgressItem[]
  /** 완료된 아이템의 실제 URL (id -> url 매핑) */
  completedUrls?: Record<string, string>
}

export function VideoTimelineSkeleton({
  count,
  duration = 10,
  items = [],
  completedUrls = {},
}: VideoTimelineSkeletonProps) {
  const itemStatusMap = new Map(items.map((item) => [item.id, item.status]))

  const skeletonItems = Array.from({ length: count }, (_, i) => {
    const itemId = items[i]?.id || `skeleton-${i}`
    const status = itemStatusMap.get(itemId) || 'pending'
    const completedUrl = completedUrls[itemId]

    return { id: itemId, index: i, status, completedUrl }
  })

  const completedCount = items.filter((i) => i.status === 'completed').length

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        비디오 생성 중 ({completedCount}/{count})
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {skeletonItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'relative aspect-video overflow-hidden rounded-lg',
              item.status === 'completed' ? 'bg-white/10' : 'bg-white/5'
            )}
          >
            {item.status === 'completed' && item.completedUrl ? (
              // 완료된 비디오 썸네일
              <>
                <video
                  src={item.completedUrl}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </>
            ) : item.status === 'processing' ? (
              // 생성 중
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-neon-pink)]" />
                <span className="text-xs text-white/60">렌더링 중</span>
              </div>
            ) : (
              // 대기 중
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-white/10 to-white/5" />
            )}

            {/* 하단 정보 */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 py-1 text-center text-xs',
                item.status === 'completed'
                  ? 'bg-[var(--color-neon-lime)]/80 text-black font-medium'
                  : item.status === 'processing'
                    ? 'bg-[var(--color-neon-pink)]/80 text-white'
                    : 'bg-black/60 text-white/60'
              )}
            >
              {item.status === 'completed'
                ? `${duration}초 완료`
                : item.status === 'processing'
                  ? '생성 중...'
                  : `Shot ${item.index + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
