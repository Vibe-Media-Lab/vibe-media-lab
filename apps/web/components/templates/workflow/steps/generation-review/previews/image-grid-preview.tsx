'use client'

import { cn } from '@/lib/utils'
import { Loader2, RotateCcw } from 'lucide-react'
import type { ImageItem } from '../types'

interface ImageGridPreviewProps {
  data: unknown
  onRegenerateItem?: (id: string) => void
}

export function ImageGridPreview({ data, onRegenerateItem }: ImageGridPreviewProps) {
  // Unwrap API response format
  let unwrapped = data as Record<string, unknown>
  if (unwrapped && typeof unwrapped === 'object' && 'success' in unwrapped && 'data' in unwrapped) {
    unwrapped = unwrapped.data as Record<string, unknown>
  }

  // Extract items from various response formats
  const response = unwrapped as {
    expanded?: ImageItem[]
    anchors?: ImageItem[]
    images?: ImageItem[]
  }
  const items: ImageItem[] = response?.expanded || response?.anchors || response?.images || (Array.isArray(data) ? data as ImageItem[] : [])

  // Group by category if available
  const characterItems = items.filter((i) => i.category === 'character')
  const backgroundItems = items.filter((i) => i.category === 'background')
  const otherItems = items.filter((i) => !i.category)

  const renderImageGrid = (gridItems: ImageItem[], title?: string) => (
    <div className="space-y-2">
      {title && (
        <span className="text-xs font-medium text-white/40">{title}</span>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {gridItems.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-white/10"
          >
            {item.url ? (
              <img
                src={item.url}
                alt={item.label || item.name || item.id}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center">
              {item.name && (
                <div className="text-xs font-medium text-white">{item.name}</div>
              )}
              {item.variation && (
                <div className="text-[10px] text-white/60">{item.variation}</div>
              )}
              {item.label && !item.name && (
                <div className="text-xs text-white">{item.label}</div>
              )}
            </div>
            {onRegenerateItem && (
              <button
                onClick={() => onRegenerateItem(item.id)}
                className={cn(
                  'absolute right-2 top-2 rounded-full bg-black/60 p-1.5',
                  'opacity-0 transition-opacity group-hover:opacity-100'
                )}
              >
                <RotateCcw className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const hasCategories = characterItems.length > 0 || backgroundItems.length > 0

  return (
    <div className="w-full space-y-4">
      <span className="text-sm font-medium text-white/60">
        이미지 ({items.length}개)
      </span>
      {hasCategories ? (
        <>
          {characterItems.length > 0 && renderImageGrid(characterItems, `캐릭터 (${characterItems.length})`)}
          {backgroundItems.length > 0 && renderImageGrid(backgroundItems, `배경 (${backgroundItems.length})`)}
        </>
      ) : (
        renderImageGrid(otherItems)
      )}
    </div>
  )
}
