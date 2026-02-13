'use client'

import * as React from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { AssetCard, type AssetItem } from '@/components/library/asset-card'
import { useImageGenerateStore } from '@/lib/stores/image-generate-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LibraryItem {
  id: string
  media_type: string
  prompt: string
  output_url: string | null
  thumbnail_url: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  is_favorite: boolean
  created_at: string
  project_id: string | null
}

interface LibraryGroup {
  date: string
  label: string
  items: LibraryItem[]
}

interface LibraryResponse {
  success: boolean
  groups: LibraryGroup[]
  counts: { all: number; image: number }
  pagination: {
    total: number
    hasMore: boolean
    nextCursor: string | null
    nextCursorId: string | null
  }
}

const ASPECT_RATIO_CLASS: Record<string, string> = {
  '1:1': 'aspect-square',
  '2:3': 'aspect-[2/3]',
  '3:2': 'aspect-[3/2]',
  '3:4': 'aspect-[3/4]',
  '4:3': 'aspect-[4/3]',
  '4:5': 'aspect-[4/5]',
  '5:4': 'aspect-[5/4]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-video',
  '21:9': 'aspect-[21/9]',
}

function toAssetItem(item: LibraryItem): AssetItem {
  return {
    id: item.id,
    media_type: item.media_type,
    prompt: item.prompt,
    output_url: item.output_url,
    thumbnail_url: item.thumbnail_url,
    width: item.width,
    height: item.height,
    duration_seconds: item.duration_seconds,
    is_favorite: item.is_favorite,
    created_at: item.created_at,
    project_id: item.project_id,
  }
}

export function ImageGrid() {
  const [items, setItems] = React.useState<LibraryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [hasMore, setHasMore] = React.useState(false)
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [nextCursorId, setNextCursorId] = React.useState<string | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  const pendingCount = useImageGenerateStore(s => s.pendingCount)
  const lastGeneratedAt = useImageGenerateStore(s => s.lastGeneratedAt)
  const aspectRatio = useImageGenerateStore(s => s.aspectRatio)

  const fetchImages = React.useCallback(
    async (cursor?: string | null, cursorId?: string | null) => {
      const params = new URLSearchParams({ type: 'image', limit: '50' })
      if (cursor && cursorId) {
        params.set('cursor', cursor)
        params.set('cursor_id', cursorId)
      }

      const res = await fetch(`/api/library?${params.toString()}`)
      const data: LibraryResponse = await res.json()
      return data
    },
    [],
  )

  // Initial load + refresh on new generation
  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchImages()
        if (cancelled) return
        if (data.success) {
          const allItems = data.groups.flatMap(g => g.items)
          setItems(allItems)
          setHasMore(data.pagination.hasMore)
          setNextCursor(data.pagination.nextCursor)
          setNextCursorId(data.pagination.nextCursorId)
        }
      } catch {
        // Silently fail for initial load
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [fetchImages, lastGeneratedAt])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const data = await fetchImages(nextCursor, nextCursorId)
      if (data.success) {
        const newItems = data.groups.flatMap(g => g.items)
        setItems(prev => [...prev, ...newItems])
        setHasMore(data.pagination.hasMore)
        setNextCursor(data.pagination.nextCursor)
        setNextCursorId(data.pagination.nextCursorId)
      }
    } catch {
      toast.error('이미지를 더 불러올 수 없습니다')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleFavoriteToggle = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, is_favorite: !i.is_favorite } : i)),
    )

    try {
      const res = await fetch(`/api/library/${id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !item.is_favorite }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setItems(prev =>
        prev.map(i => (i.id === id ? { ...i, is_favorite: item.is_favorite } : i)),
      )
    }
  }

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))

    try {
      const res = await fetch(`/api/library/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('삭제되었습니다')
    } catch {
      // Refetch to restore
      const data = await fetchImages()
      if (data.success) {
        setItems(data.groups.flatMap(g => g.items))
      }
    }
  }

  const skeletonAspectClass = ASPECT_RATIO_CLASS[aspectRatio] || 'aspect-square'

  // Empty state
  if (!loading && items.length === 0 && pendingCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ImageIcon className="h-16 w-16 text-white/20 mb-4" />
        <h3 className="text-lg font-medium text-white/60 mb-2">
          아직 생성된 이미지가 없습니다
        </h3>
        <p className="text-sm text-white/40">
          아래에서 프롬프트를 입력하여 이미지를 생성하세요
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Masonry grid */}
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
        {/* Skeleton placeholders */}
        {Array.from({ length: pendingCount }).map((_, i) => (
          <div key={`skeleton-${i}`} className="mb-4 break-inside-avoid">
            <div
              className={cn(
                'rounded-lg bg-white/5 animate-pulse',
                skeletonAspectClass,
              )}
            >
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/20" />
              </div>
            </div>
          </div>
        ))}

        {/* Loading skeletons for initial load */}
        {loading &&
          items.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`loading-${i}`} className="mb-4 break-inside-avoid">
              <div className="aspect-square rounded-lg bg-white/5 animate-pulse" />
            </div>
          ))}

        {/* Actual items */}
        {items.map((item) => (
          <div key={item.id} className="mb-4 break-inside-avoid">
            <AssetCard
              asset={toAssetItem(item)}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleDelete}
            />
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-medium transition-colors',
              'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                불러오는 중...
              </span>
            ) : (
              '더 보기'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
