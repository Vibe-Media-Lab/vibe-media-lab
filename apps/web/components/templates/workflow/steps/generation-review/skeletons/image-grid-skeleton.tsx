'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { GenerationProgressItem } from '../types'

interface ImageGridSkeletonProps {
  /** 예상 아이템 개수 */
  count: number
  /** 진행 중인 아이템들의 상태 */
  items?: GenerationProgressItem[]
  /** 완료된 아이템의 실제 URL (id -> url 매핑) */
  completedUrls?: Record<string, string>
}

export function ImageGridSkeleton({
  count,
  items = [],
  completedUrls = {},
}: ImageGridSkeletonProps) {
  // 아이템 상태 매핑 생성
  const itemStatusMap = new Map(items.map((item) => [item.id, item.status]))

  // count만큼 스켈레톤/실제 이미지 렌더링
  const skeletonItems = Array.from({ length: count }, (_, i) => {
    const itemId = items[i]?.id || `skeleton-${i}`
    const status = itemStatusMap.get(itemId) || 'pending'
    const completedUrl = completedUrls[itemId]

    return { id: itemId, index: i, status, completedUrl }
  })

  return (
    <div className="w-full space-y-4">
      <span className="text-sm font-medium text-white/60">
        이미지 생성 중 ({items.filter((i) => i.status === 'completed').length}/{count})
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {skeletonItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'relative aspect-square overflow-hidden rounded-lg',
              item.status === 'completed' ? 'bg-white/10' : 'bg-white/5'
            )}
          >
            {item.status === 'completed' && item.completedUrl ? (
              // 완료된 이미지 표시
              <img
                src={item.completedUrl}
                alt={`Generated ${item.index + 1}`}
                className="h-full w-full object-cover animate-in fade-in duration-500"
              />
            ) : item.status === 'processing' ? (
              // 생성 중
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-neon-pink)]" />
                <span className="text-xs text-white/60">생성 중...</span>
              </div>
            ) : (
              // 대기 중 - 펄스 애니메이션
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-white/10 to-white/5" />
            )}

            {/* 번호 표시 */}
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
                ? '완료'
                : item.status === 'processing'
                  ? '생성 중'
                  : `대기 #${item.index + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
