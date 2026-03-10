'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, Download } from 'lucide-react'
import { unwrapApiData } from '@/lib/workflow/helpers'

interface ImageSelectPreviewProps {
  data: unknown
  onEdit?: (data: unknown) => void
  onDownloadItem?: (id: string, url: string) => void
}

interface ImageSelectData {
  images?: Array<{ id: string; url: string; prompt?: string }>
  selectedImageId?: string
  selectedImageUrl?: string
}

export function ImageSelectPreview({
  data,
  onEdit,
  onDownloadItem,
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
    const selectedImage = images.find((img) => img.id === imageId)
    onEdit({
      ...response,
      selectedImageId: imageId,
      selectedImageUrl: selectedImage?.url || '',
    })
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        이미지를 선택하세요 ({images.length}개)
      </span>

      <div
        role="radiogroup"
        aria-label="메인 초상화 선택"
        className="grid grid-cols-2 gap-3"
      >
        {images.map((image) => {
          const isSelected = selectedId === image.id
          return (
            <div
              key={image.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={`초상화 ${image.id}`}
              tabIndex={0}
              onClick={() => handleSelect(image.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  handleSelect(image.id)
                }
              }}
              className={cn(
                'group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-cyan)]',
                isSelected
                  ? 'border-[var(--color-neon-cyan)] ring-2 ring-[var(--color-neon-cyan)]/30'
                  : 'border-white/20 hover:border-white/40'
              )}
            >
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={`초상화 ${image.id}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5">
                  <span className="text-sm text-white/40">로딩 중...</span>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-neon-cyan)]">
                  <Check className="h-4 w-4 text-black" />
                </div>
              )}

              {/* Download button on hover */}
              {image.url && onDownloadItem && (
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
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
