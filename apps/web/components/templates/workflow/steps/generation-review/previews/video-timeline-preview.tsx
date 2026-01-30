'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Play, Pause, RotateCcw } from 'lucide-react'
import type { VideoItem } from '../types'

interface VideoTimelinePreviewProps {
  data: VideoItem[]
  onRegenerateItem?: (id: string) => void
}

export function VideoTimelinePreview({ data, onRegenerateItem }: VideoTimelinePreviewProps) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({})

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
            style={{ width: `${Math.max(80, item.duration * 15)}px` }}
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
              {item.url && (
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
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
              {item.duration}초
            </div>
            {onRegenerateItem && (
              <button
                onClick={() => onRegenerateItem(item.id)}
                className={cn(
                  'absolute right-1 top-1 rounded-full bg-black/60 p-1',
                  'opacity-0 transition-opacity group-hover:opacity-100'
                )}
              >
                <RotateCcw className="h-2.5 w-2.5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
