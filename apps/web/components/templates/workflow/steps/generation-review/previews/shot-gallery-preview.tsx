'use client'

import { cn } from '@/lib/utils'
import { Sparkles, RotateCcw } from 'lucide-react'
import type { Shot } from '../types'

interface ShotGalleryPreviewProps {
  data: unknown
  onRegenerateItem?: (id: string) => void
}

export function ShotGalleryPreview({ data, onRegenerateItem }: ShotGalleryPreviewProps) {
  // Extract shots from API response format
  let unwrapped = data as Record<string, unknown>
  if (unwrapped && typeof unwrapped === 'object' && 'success' in unwrapped && 'data' in unwrapped) {
    unwrapped = unwrapped.data as Record<string, unknown>
  }
  const shots: Shot[] = (unwrapped?.shots as Shot[]) || (Array.isArray(data) ? data as Shot[] : [])

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
              {onRegenerateItem && (
                <button
                  onClick={() => onRegenerateItem(shot.id)}
                  className={cn(
                    'absolute right-2 top-2 rounded-full bg-black/60 p-1.5',
                    'opacity-0 transition-opacity group-hover:opacity-100'
                  )}
                >
                  <RotateCcw className="h-3 w-3 text-white" />
                </button>
              )}
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
