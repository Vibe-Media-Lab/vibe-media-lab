'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, RotateCcw, Heart, Download } from 'lucide-react'
import type { Shot } from '../types'
import { unwrapApiData } from '@/lib/api/kids-animation/types'

interface ShotGalleryPreviewProps {
  data: unknown
  onRegenerateItem?: (id: string) => void
  onLikeItem?: (id: string, url: string) => void
  onDownloadItem?: (id: string, url: string) => void
}

export function ShotGalleryPreview({ data, onRegenerateItem, onLikeItem, onDownloadItem }: ShotGalleryPreviewProps) {
  const [likedItems, setLikedItems] = React.useState<Set<string>>(new Set())

  const handleLike = (id: string, url: string) => {
    setLikedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
    onLikeItem?.(id, url)
  }

  const handleDownload = async (id: string, url: string) => {
    if (onDownloadItem) {
      onDownloadItem(id, url)
      return
    }
    // Default download behavior
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  // Extract shots from API response format
  const unwrapped = unwrapApiData<{ shots?: Shot[] }>(data)
  const shots: Shot[] = unwrapped?.shots || (Array.isArray(data) ? data as Shot[] : [])

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        샷 갤러리 ({shots.length}샷)
      </span>
      <div className="grid gap-4 sm:grid-cols-2">
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="group overflow-hidden rounded-lg border border-white/20 bg-white/5"
          >
            <div className="relative aspect-video bg-white/10">
              {shot.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shot.imageUrl}
                  alt={`Shot ${shot.shotNumber}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white/20" />
                </div>
              )}
              <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                #{shot.shotNumber} · {shot.duration}초
              </div>
              {/* Hover action buttons */}
              <div className={cn(
                'absolute right-2 top-2 flex gap-1',
                'opacity-0 transition-opacity group-hover:opacity-100'
              )}>
                {shot.imageUrl && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLike(shot.id, shot.imageUrl!)
                      }}
                      className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                      title="좋아요"
                    >
                      <Heart className={cn('h-3 w-3', likedItems.has(shot.id) ? 'fill-red-500 text-red-500' : 'text-white')} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(shot.id, shot.imageUrl!)
                      }}
                      className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                      title="다운로드"
                    >
                      <Download className="h-3 w-3 text-white" />
                    </button>
                  </>
                )}
                {onRegenerateItem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRegenerateItem(shot.id)
                    }}
                    className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                    title="재생성"
                  >
                    <RotateCcw className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm text-white/80 line-clamp-2">
                {shot.narration}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
