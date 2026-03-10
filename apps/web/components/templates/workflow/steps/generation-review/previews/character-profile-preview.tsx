'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Download, RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import { unwrapApiData } from '@/lib/workflow/helpers'

interface CharacterProfilePreviewProps {
  data: unknown
  onDownloadItem?: (id: string, url: string) => void
  onRegenerateItem?: (id: string) => void
  regeneratingItemId?: string | null
}

interface CharacterSheetData {
  selectedImageUrl?: string
  characterName?: string
  characterDescription?: string
  sheets?: Array<{ id: string; url: string; variation: string; status?: 'completed' | 'failed' }>
}

export function CharacterProfilePreview({
  data,
  onDownloadItem,
  onRegenerateItem,
  regeneratingItemId,
}: CharacterProfilePreviewProps) {
  const response = unwrapApiData<CharacterSheetData>(data)
  const sheets = response?.sheets || []
  const heroUrl = response?.selectedImageUrl || ''
  const characterName = response?.characterName || ''
  const characterDescription = response?.characterDescription || ''

  return (
    <div className="w-full space-y-4">
      <span className="text-sm font-medium text-white/60">캐릭터 시트</span>

      {/* Hero section: selected main portrait + character info */}
      {heroUrl && (
        <div className="flex gap-4 rounded-xl bg-white/5 p-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt={characterName || '메인 초상화'}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center gap-1">
            {/* SECURITY: characterName/Description은 LLM 생성 데이터. text node으로만 렌더링.
                dangerouslySetInnerHTML 절대 사용 금지. */}
            {characterName && (
              <h3 className="text-lg font-semibold text-white">{characterName}</h3>
            )}
            {characterDescription && (
              <p className="line-clamp-3 text-xs text-white/50">{characterDescription}</p>
            )}
          </div>
        </div>
      )}

      {/* Variation sheets grid */}
      {sheets.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sheets.map((sheet) => {
            const isFailed = sheet.status === 'failed' || !sheet.url
            const isRegenerating = regeneratingItemId === sheet.id
            return (
              <div
                key={sheet.id}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-xl border bg-white/5',
                  isFailed ? 'border-red-500/40' : 'border-white/20',
                  isRegenerating && 'border-[var(--color-neon-cyan)]/40'
                )}
              >
                {sheet.url && !isFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sheet.url}
                    alt={sheet.variation}
                    className={cn(
                      'h-full w-full object-cover transition-opacity',
                      isRegenerating && 'opacity-40'
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400/60" />
                    <span className="text-xs text-red-400/80">생성 실패</span>
                    {onRegenerateItem && !isRegenerating && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRegenerateItem(sheet.id)
                        }}
                        className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
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
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-neon-cyan)]" />
                    <span className="text-xs text-white/80">재생성 중...</span>
                  </div>
                )}

                {/* Variation label */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-center">
                  <span className="text-xs font-medium text-white">{sheet.variation}</span>
                </div>

                {/* Action buttons on hover */}
                {!isRegenerating && (
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {onRegenerateItem && sheet.url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRegenerateItem(sheet.id)
                        }}
                        className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                        aria-label={`${sheet.variation} 재생성`}
                        title="재생성"
                      >
                        <RotateCcw className="h-3 w-3 text-white" />
                      </button>
                    )}
                    {sheet.url && onDownloadItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownloadItem(sheet.id, sheet.url)
                        }}
                        className="rounded-full bg-black/60 p-1.5 hover:bg-black/80"
                        aria-label={`${sheet.variation} 다운로드`}
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
      ) : (
        <div className="rounded-lg bg-white/5 p-4 text-center text-sm text-white/60">
          캐릭터 시트가 없습니다
        </div>
      )}
    </div>
  )
}
