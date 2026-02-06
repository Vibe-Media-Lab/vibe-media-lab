'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, Check } from 'lucide-react'
import type { AudioItem } from '../types'

interface AudioPlayerPreviewProps {
  data: AudioItem[]
  selectedBgmIndex?: number
  onSelectBgm?: (index: number) => void
  // 재생성 선택 기능
  regenerateMode?: boolean
  selectedForRegenerate?: Set<string>
  onToggleRegenerate?: (id: string, isBgm: boolean) => void
}

export function AudioPlayerPreview({
  data,
  selectedBgmIndex = 0,
  onSelectBgm,
  regenerateMode = false,
  selectedForRegenerate,
  onToggleRegenerate,
}: AudioPlayerPreviewProps) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({})

  const handlePlayPause = (id: string) => {
    const audio = audioRefs.current[id]
    if (!audio) return

    if (playingId === id) {
      audio.pause()
      setPlayingId(null)
    } else {
      Object.values(audioRefs.current).forEach((a) => a?.pause())
      audio.play()
      setPlayingId(id)
    }
  }

  // TTS와 BGM 분리
  const ttsItems = data.filter(item => !item.isBgm)
  const bgmItems = data.filter(item => item.isBgm)

  const isSelectedForRegen = (id: string) => selectedForRegenerate?.has(id) ?? false

  return (
    <div className="w-full space-y-4">
      {/* TTS 섹션 */}
      {ttsItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">
              나레이션 ({ttsItems.length}개)
            </span>
            {regenerateMode && onToggleRegenerate && (
              <button
                onClick={() => {
                  const allSelected = ttsItems.every(item => isSelectedForRegen(item.id))
                  ttsItems.forEach(item => {
                    if (allSelected !== isSelectedForRegen(item.id) || !allSelected) {
                      onToggleRegenerate(item.id, false)
                    }
                  })
                }}
                className="text-xs text-[var(--color-neon-cyan)] hover:underline"
              >
                {ttsItems.every(item => isSelectedForRegen(item.id)) ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {ttsItems.map((item) => (
              <AudioItemRow
                key={item.id}
                item={item}
                isPlaying={playingId === item.id}
                onPlayPause={() => handlePlayPause(item.id)}
                audioRef={(el) => { audioRefs.current[item.id] = el }}
                onEnded={() => setPlayingId(null)}
                regenerateMode={regenerateMode}
                isSelectedForRegen={isSelectedForRegen(item.id)}
                onToggleRegenerate={onToggleRegenerate ? () => onToggleRegenerate(item.id, false) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* BGM 섹션 */}
      {bgmItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">
              BGM ({bgmItems.length}개)
            </span>
            {regenerateMode && onToggleRegenerate && (
              <button
                onClick={() => onToggleRegenerate('bgm', true)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-md border transition-colors",
                  isSelectedForRegen('bgm')
                    ? "bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]"
                    : "text-white/60 hover:text-white border-white/30 hover:border-white/50"
                )}
              >
                {isSelectedForRegen('bgm') ? '✓ BGM 재생성 선택됨' : 'BGM 재생성'}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {bgmItems.map((item) => {
              const isSelected = item.bgmIndex === selectedBgmIndex
              return (
                <AudioItemRow
                  key={item.id}
                  item={item}
                  isPlaying={playingId === item.id}
                  onPlayPause={() => handlePlayPause(item.id)}
                  audioRef={(el) => { audioRefs.current[item.id] = el }}
                  onEnded={() => setPlayingId(null)}
                  isBgmSelected={isSelected}
                  onSelectBgm={onSelectBgm ? () => onSelectBgm(item.bgmIndex ?? 0) : undefined}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// 개별 오디오 아이템 행 컴포넌트
function AudioItemRow({
  item,
  isPlaying,
  onPlayPause,
  audioRef,
  onEnded,
  isBgmSelected,
  onSelectBgm,
  regenerateMode,
  isSelectedForRegen,
  onToggleRegenerate,
}: {
  item: AudioItem
  isPlaying: boolean
  onPlayPause: () => void
  audioRef: (el: HTMLAudioElement | null) => void
  onEnded: () => void
  isBgmSelected?: boolean
  onSelectBgm?: () => void
  regenerateMode?: boolean
  isSelectedForRegen?: boolean
  onToggleRegenerate?: () => void
}) {
  const hasError = !item.url || item.url.length === 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        hasError
          ? 'border-red-500/50 bg-red-500/10'
          : item.isBgm && isBgmSelected
            ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10'
            : isSelectedForRegen
              ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/10'
              : 'border-white/20 bg-white/5'
      )}
    >
      {/* 재생성 체크박스 (TTS만, 재생성 모드일 때) */}
      {regenerateMode && !item.isBgm && onToggleRegenerate && (
        <button
          onClick={onToggleRegenerate}
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2',
            isSelectedForRegen
              ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]'
              : 'border-white/40 bg-transparent hover:border-white/60'
          )}
        >
          {isSelectedForRegen && <Check className="h-3 w-3 text-black" />}
        </button>
      )}

      {/* BGM 선택 라디오 버튼 */}
      {item.isBgm && onSelectBgm && !regenerateMode && (
        <button
          onClick={onSelectBgm}
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
            isBgmSelected
              ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]'
              : 'border-white/40 bg-transparent hover:border-white/60'
          )}
        >
          {isBgmSelected && <div className="h-2 w-2 rounded-full bg-white" />}
        </button>
      )}

      <button
        onClick={onPlayPause}
        disabled={hasError}
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          hasError
            ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
            : 'bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]'
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {item.label}
          {hasError && <span className="ml-2 text-xs text-red-400">생성 실패</span>}
          {item.isBgm && isBgmSelected && !regenerateMode && (
            <span className="ml-2 text-xs text-[var(--color-neon-pink)]">선택됨</span>
          )}
          {isSelectedForRegen && (
            <span className="ml-2 text-xs text-[var(--color-neon-cyan)]">재생성</span>
          )}
        </p>
        {item.duration && (
          <p className="text-xs text-white/40">
            {Math.floor(item.duration / 60)}:
            {String(Math.floor(item.duration % 60)).padStart(2, '0')}
          </p>
        )}
      </div>

      <Volume2 className="h-4 w-4 text-white/40" />
      <audio ref={audioRef} src={item.url} onEnded={onEnded} />
    </div>
  )
}
