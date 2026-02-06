'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, RotateCcw, Heart, Download } from 'lucide-react'
import type { ImageItem } from '../types'
import { unwrapApiData } from '@/lib/api/kids-animation/types'

interface ImageGridPreviewProps {
  data: unknown
  onRegenerateItem?: (id: string) => void
  onLikeItem?: (id: string, url: string) => void
  onDownloadItem?: (id: string, url: string) => void
}

export function ImageGridPreview({ data, onRegenerateItem, onLikeItem, onDownloadItem }: ImageGridPreviewProps) {
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
  // Extract items from various response formats
  const response = unwrapApiData<{
    expanded?: ImageItem[]
    anchors?: ImageItem[]
    images?: ImageItem[]
  }>(data)
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
              // eslint-disable-next-line @next/next/no-img-element
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
            {/* Hover action buttons */}
            <div className={cn(
              'absolute right-2 top-2 flex gap-1',
              'opacity-0 transition-opacity group-hover:opacity-100'
            )}>
              {item.url && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(item.id, item.url!)
                    }}
                    className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                    title="좋아요"
                  >
                    <Heart className={cn('h-3 w-3', likedItems.has(item.id) ? 'fill-red-500 text-red-500' : 'text-white')} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(item.id, item.url!)
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
                    onRegenerateItem(item.id)
                  }}
                  className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                  title="재생성"
                >
                  <RotateCcw className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
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
