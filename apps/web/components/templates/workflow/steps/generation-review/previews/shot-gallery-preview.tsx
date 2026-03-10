'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, RotateCcw, Heart, Download, Loader2, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Shot } from '../types'
import { unwrapApiData } from '@/lib/workflow/helpers'

interface ShotGalleryPreviewProps {
  data: unknown
  onRegenerateItem?: (id: string, editedPrompt?: string) => void
  onLikeItem?: (id: string, url: string) => void
  onDownloadItem?: (id: string, url: string) => void
  regeneratingItemId?: string | null
}

export function ShotGalleryPreview({ data, onRegenerateItem, onLikeItem, onDownloadItem, regeneratingItemId }: ShotGalleryPreviewProps) {
  const [likedItems, setLikedItems] = React.useState<Set<string>>(new Set())
  const [editingShot, setEditingShot] = React.useState<Shot | null>(null)
  const [editedPrompt, setEditedPrompt] = React.useState('')

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
        {shots.map((shot) => {
          const isRegenerating = regeneratingItemId === shot.id

          return (
            <div
              key={shot.id}
              className={cn(
                'group overflow-hidden rounded-lg border bg-white/5',
                isRegenerating
                  ? 'border-[var(--color-neon-cyan)]/40'
                  : 'border-white/20'
              )}
            >
              <div className="relative aspect-video bg-white/10">
                {shot.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shot.imageUrl}
                    alt={`Shot ${shot.shotNumber}`}
                    className={cn(
                      'h-full w-full object-cover transition-opacity',
                      isRegenerating && 'opacity-40'
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-white/20" />
                    <span className="text-xs text-white/40">이미지 생성 실패</span>
                    {onRegenerateItem && !isRegenerating && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 border-white/30 bg-transparent text-xs text-white hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingShot(shot)
                          setEditedPrompt(shot.visualPrompt)
                        }}
                      >
                        <Edit3 className="mr-1 h-3 w-3" />
                        프롬프트 수정 후 재생성
                      </Button>
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
                <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  #{shot.shotNumber} · {shot.duration}초
                </div>
                {/* Hover action buttons */}
                {!isRegenerating && (
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
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingShot(shot)
                            setEditedPrompt(shot.visualPrompt)
                          }}
                          className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                          title="프롬프트 수정 후 재생성"
                        >
                          <Edit3 className="h-3 w-3 text-white" />
                        </button>
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
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-white/80 line-clamp-2">
                  {shot.narration}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 프롬프트 편집 다이얼로그 */}
      <Dialog open={!!editingShot} onOpenChange={(open) => !open && setEditingShot(null)}>
        <DialogContent className="border-white/20 bg-[#1a1a2e] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Shot #{editingShot?.shotNumber} 프롬프트 수정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <span className="text-xs text-white/40">비주얼 프롬프트</span>
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && editedPrompt.trim()) {
                  if (editingShot && onRegenerateItem) {
                    onRegenerateItem(editingShot.id, editedPrompt.trim())
                    setEditingShot(null)
                  }
                }
              }}
              className="w-full rounded-lg border border-white/30 bg-white/5 p-3 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingShot(null)}
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              취소
            </Button>
            <Button
              disabled={!editedPrompt.trim()}
              onClick={() => {
                if (editingShot && onRegenerateItem && editedPrompt.trim()) {
                  onRegenerateItem(editingShot.id, editedPrompt.trim())
                  setEditingShot(null)
                }
              }}
              className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] disabled:opacity-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              재생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
