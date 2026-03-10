'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, Download, RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import { unwrapApiData } from '@/lib/workflow/helpers'

interface ImageSelectPreviewProps {
  data: unknown
  onEdit?: (data: unknown) => void
  onDownloadItem?: (id: string, url: string) => void
  onRegenerateItem?: (id: string) => void
  regeneratingItemId?: string | null
}

interface ImageSelectData {
  images?: Array<{ id: string; url: string; prompt?: string; status?: 'completed' | 'failed' }>
  selectedImageId?: string
  selectedImageUrl?: string
  selectedVisualDescription?: string
}

export function ImageSelectPreview({
  data,
  onEdit,
  onDownloadItem,
  onRegenerateItem,
  regeneratingItemId,
}: ImageSelectPreviewProps) {
  const response = unwrapApiData<ImageSelectData>(data)
  const images = response?.images || []
  const selectedId = response?.selectedImageId || ''

  if (images.length === 0) {
    return (
      <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        생성된 이미지가 없습니다
      </div>
    )
  }

  const handleSelect = (imageId: string) => {
    if (!onEdit) return
    // 실패 항목 선택 차단
    const image = images.find((img) => img.id === imageId)
    if (!image?.url) return

    onEdit({
      ...response,
      selectedImageId: imageId,
      selectedImageUrl: image.url,
      selectedVisualDescription: image.prompt || '',
    })
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        이미지를 선택하세요 ({images.filter((img) => img.url).length}개)
      </span>

      <div
        role="radiogroup"
        aria-label="메인 초상화 선택"
        className="grid grid-cols-2 gap-3"
      >
        {images.map((image) => {
          const isSelected = selectedId === image.id
          const isFailed = image.status === 'failed' || !image.url
          const isRegenerating = regeneratingItemId === image.id
          return (
            <div
              key={image.id}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isFailed}
              aria-label={`초상화 ${image.id}`}
              tabIndex={isFailed ? -1 : 0}
              onClick={() => !isFailed && handleSelect(image.id)}
              onKeyDown={(e) => {
                if ((e.key === ' ' || e.key === 'Enter') && !isFailed) {
                  e.preventDefault()
                  handleSelect(image.id)
                }
              }}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-xl border-2 transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-cyan)]',
                isFailed
                  ? 'cursor-not-allowed border-red-500/40 opacity-70'
                  : isSelected
                    ? 'cursor-pointer border-[var(--color-neon-cyan)] ring-2 ring-[var(--color-neon-cyan)]/30'
                    : 'cursor-pointer border-white/20 hover:border-white/40'
              )}
            >
              {image.url && !isFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={`초상화 ${image.id}`}
                  className={cn(
                    'h-full w-full object-cover transition-opacity',
                    isRegenerating && 'opacity-40'
                  )}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/5">
                  <AlertTriangle className="h-6 w-6 text-red-400/60" />
                  <span className="text-xs text-red-400/80">생성 실패</span>
                  {onRegenerateItem && !isRegenerating && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRegenerateItem(image.id)
                      }}
                      className="mt-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
                    >
                      <RotateCcw className="mr-1 inline h-3 w-3" />
                      재생성
                    </button>
                  )}
                </div>
              )}

              {/* 재생성 로딩 오버레이 */}
              {isRegenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-neon-cyan)]" />
                  <span className="text-xs text-white/80">재생성 중...</span>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && !isFailed && (
                <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-neon-cyan)]">
                  <Check className="h-4 w-4 text-black" />
                </div>
              )}

              {/* Action buttons on hover */}
              {image.url && !isRegenerating && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {onRegenerateItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRegenerateItem(image.id)
                      }}
                      className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                      aria-label={`초상화 ${image.id} 재생성`}
                      title="재생성"
                    >
                      <RotateCcw className="h-3 w-3 text-white" />
                    </button>
                  )}
                  {onDownloadItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDownloadItem(image.id, image.url)
                      }}
                      className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                      aria-label={`초상화 ${image.id} 다운로드`}
                      title="다운로드"
                    >
                      <Download className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!selectedId && (
        <p className="text-center text-xs text-yellow-400/70">
          다음 단계로 진행하려면 이미지를 선택해주세요
        </p>
      )}
    </div>
  )
}
