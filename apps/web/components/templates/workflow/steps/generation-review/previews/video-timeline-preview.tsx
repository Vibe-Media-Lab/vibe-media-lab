'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Play, Pause, RotateCcw, Heart, Download } from 'lucide-react'
import type { VideoItem } from '../types'

interface VideoTimelinePreviewProps {
  data: VideoItem[]
  onRegenerateItem?: (id: string, editedPrompt?: string) => void
  onLikeItem?: (id: string, url: string) => void
  onDownloadItem?: (id: string, url: string) => void
  regeneratingItemId?: string | null
}

export function VideoTimelinePreview({ data, onRegenerateItem, onLikeItem, onDownloadItem, regeneratingItemId }: VideoTimelinePreviewProps) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const [likedItems, setLikedItems] = React.useState<Set<string>>(new Set())
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({})

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
      link.download = `${id}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handlePlayPause = (id: string) => {
    const video = videoRefs.current[id]
    if (!video) return

    if (playingId === id) {
      video.pause()
      setPlayingId(null)
    } else {
      // Pause other videos
      Object.values(videoRefs.current).forEach((v) => v?.pause())
      video.play()
      setPlayingId(id)
    }
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        비디오 타임라인 ({data.length}개)
      </span>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {data.map((item) => (
          <div
            key={item.id}
            className="group relative flex-shrink-0 overflow-hidden rounded-lg"
            style={{ width: `${Math.max(160, item.duration * 30)}px` }}
          >
            <div className="relative aspect-video bg-white/10">
              {item.url ? (
                <video
                  ref={(el) => {
                    videoRefs.current[item.id] = el
                  }}
                  src={item.url}
                  poster={item.thumbnailUrl}
                  className="h-full w-full object-cover"
                  onEnded={() => setPlayingId(null)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                </div>
              )}
              {item.url && regeneratingItemId !== item.id && (
                <button
                  onClick={() => handlePlayPause(item.id)}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    'bg-black/40 transition-opacity',
                    playingId === item.id
                      ? 'opacity-0 hover:opacity-100'
                      : 'opacity-100'
                  )}
                >
                  {playingId === item.id ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white" />
                  )}
                </button>
              )}
              {regeneratingItemId === item.id && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-neon-cyan)]" />
                  <span className="mt-1 text-[10px] text-white/80">재생성 중...</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
              {item.duration}초
            </div>
            {/* Hover action buttons */}
            <div className={cn(
              'absolute right-1 top-1 flex gap-0.5',
              'opacity-0 transition-opacity group-hover:opacity-100'
            )}>
              {item.url && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(item.id, item.url!)
                    }}
                    className="rounded-full bg-black/60 p-1 hover:bg-black/80"
                    title="좋아요"
                  >
                    <Heart className={cn('h-2.5 w-2.5', likedItems.has(item.id) ? 'fill-red-500 text-red-500' : 'text-white')} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(item.id, item.url!)
                    }}
                    className="rounded-full bg-black/60 p-1 hover:bg-black/80"
                    title="다운로드"
                  >
                    <Download className="h-2.5 w-2.5 text-white" />
                  </button>
                </>
              )}
              {onRegenerateItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRegenerateItem(item.id)
                  }}
                  className={cn(
                    'rounded-full bg-black/60 p-1 hover:bg-black/80',
                    regeneratingItemId && 'pointer-events-none opacity-50'
                  )}
                  disabled={!!regeneratingItemId}
                  title="재생성"
                >
                  <RotateCcw className={cn('h-2.5 w-2.5 text-white', regeneratingItemId === item.id && 'animate-spin')} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
